let youtubeTabs = new Map();
let isTracking = false;
let updateTimer = null;
let sessionStartTime = null;
let totalSessionTime = 0;
let breakThresholdMinutes = 30;
let originalThreshold = 30;

chrome.storage.local.get(["breakThreshold"], (result) => {
  if (result.breakThreshold) {
    breakThresholdMinutes = result.breakThreshold;
    originalThreshold = result.breakThreshold;
  }
});

function calculateDuration(duration, precise = false) {
  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);

  if (precise) {
    const seconds = Math.floor((duration % 60000) / 1000);
    if (hours > 0) {
      return `${hours} hours ${minutes} minutes ${seconds} seconds`;
    }
    return `${minutes} minutes ${seconds} seconds`;
  } else {
    if (hours > 0) {
      return `${hours} hours ${minutes} minutes`;
    }
    return `${minutes} minutes`;
  }
}

let popupShown = false;

function checkBreakNeeded(currentDuration) {
  const thresholdMs = breakThresholdMinutes * 60 * 1000;

  if (currentDuration >= thresholdMs && !popupShown) {
    popupShown = true;
    chrome.windows.create({
      url: "break-popup.html",
      type: "popup",
      width: 340,
      height: 190,
      left: Math.round((screen.width - 340) / 2),
      top: Math.round((screen.height - 190) / 2),
    });
  }
}

function resetTimer() {
  totalSessionTime = 0;
  sessionStartTime = Date.now();
  breakThresholdMinutes = originalThreshold;
  popupShown = false;
  updateTrackingState();
}

function extendThreshold() {
  breakThresholdMinutes += 5;
  popupShown = false;
  updateTrackingState();
}

function updateTrackingState() {
  const currentTime = Date.now();
  const currentSessionDuration = sessionStartTime
    ? totalSessionTime + (currentTime - sessionStartTime)
    : totalSessionTime;

  const state = {
    isTracking,
    currentSessionDuration: calculateDuration(currentSessionDuration, true),
    totalSessionTime: currentSessionDuration,
  };

  chrome.storage.local.set({ trackingState: state });
  checkBreakNeeded(currentSessionDuration);
}

function startPeriodicUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
  updateTrackingState();
  updateTimer = setInterval(updateTrackingState, 1000);
}

function stopPeriodicUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
  if (sessionStartTime) {
    totalSessionTime += Date.now() - sessionStartTime;
    sessionStartTime = null;
  }
  updateTrackingState();
}

function pauseTracking() {
  if (sessionStartTime) {
    totalSessionTime += Date.now() - sessionStartTime;
    sessionStartTime = null;
    updateTrackingState();
  }
}

function resumeTracking() {
  sessionStartTime = Date.now();
  updateTrackingState();
}

function checkYouTubeActivity() {
  const hasPlayingYouTube = Array.from(youtubeTabs.values()).some(
    (tab) => tab.isPlaying
  );

  const hasActiveYouTube = Array.from(youtubeTabs.values()).some(
    (tab) => tab.url && tab.url.includes("youtube.com")
  );

  if (!hasActiveYouTube) {
    if (isTracking) {
      isTracking = false;
      stopPeriodicUpdate();
      totalSessionTime = 0;
      sessionStartTime = null;
    }
  } else {
    if (hasPlayingYouTube) {
      if (!isTracking) {
        isTracking = true;
        totalSessionTime = 0;
        sessionStartTime = Date.now();
        startPeriodicUpdate();
      } else if (!sessionStartTime) {
        resumeTracking();
      }
    } else if (isTracking && sessionStartTime) {
      pauseTracking();
    }
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes("youtube.com")) {
    const currentTab = youtubeTabs.get(tabId) || {
      isPlaying: false,
      url: tab.url,
    };
    if (changeInfo.audible !== undefined) {
      currentTab.isPlaying = changeInfo.audible;
    }
    youtubeTabs.set(tabId, currentTab);
    checkYouTubeActivity();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "takeBreak") {
    resetTimer();
  } else if (message.action === "continueWatching") {
    extendThreshold();
  } else if (message.action === "debugTriggerBreak") {
    const debugDuration = breakThresholdMinutes * 60 * 1000 + 1000;
    checkBreakNeeded(debugDuration);
    sendResponse({ status: "Break triggered" });
  }
  return true;
});

chrome.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    if (tab.url && tab.url.includes("youtube.com")) {
      youtubeTabs.set(tab.id, {
        isPlaying: tab.audible || false,
        url: tab.url,
      });
    }
  });
  checkYouTubeActivity();
});
