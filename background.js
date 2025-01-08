let youtubeTabs = new Map();
let isTracking = false;
let updateTimer = null;
let sessionStartTime = null;
let totalSessionTime = 0;
let breakThresholdMinutes = 30;

chrome.storage.local.get(["breakThreshold"], (result) => {
  if (result.breakThreshold) {
    breakThresholdMinutes = result.breakThreshold;
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

function checkBreakNeeded(currentDuration) {
  const thresholdMs = breakThresholdMinutes * 60 * 1000;
  const lastNotificationTime = window.lastNotificationTime || 0;
  const timeSinceLastNotification = Date.now() - lastNotificationTime;

  // Only show notification if enough time has passed since last one (5 minutes)
  if (
    currentDuration >= thresholdMs &&
    timeSinceLastNotification >= 5 * 60 * 1000
  ) {
    window.lastNotificationTime = Date.now();
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Time for a Break",
      message: `You've been watching YouTube for ${breakThresholdMinutes} minutes. Consider taking a break!`,
      requireInteraction: true,
    });
  }
}

function updateTrackingState() {
  const currentTime = Date.now();
  const currentSessionDuration = sessionStartTime
    ? totalSessionTime + (currentTime - sessionStartTime)
    : totalSessionTime;

  console.log("Current duration (ms):", currentSessionDuration);
  console.log("Threshold (ms):", breakThresholdMinutes * 60 * 1000);

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

chrome.tabs.onRemoved.addListener((tabId) => {
  if (youtubeTabs.has(tabId)) {
    youtubeTabs.delete(tabId);
    checkYouTubeActivity();
  }
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
