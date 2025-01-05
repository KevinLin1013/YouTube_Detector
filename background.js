// Track all YouTube tabs and their states
let youtubeTabs = new Map(); // Map to store tab info
let isTracking = false;
let updateTimer = null;
let sessionStartTime = null;
let totalSessionTime = 0;
let totalWatchTime = 0;

// Initialize total watch time from storage
function initializeFromStorage() {
  chrome.storage.local.get(["persistentTotalTime"], (result) => {
    if (result.persistentTotalTime !== undefined) {
      totalWatchTime = result.persistentTotalTime;
      console.log("Initialized persistent total watch time:", totalWatchTime);
    }
  });
}

// Call initialization
initializeFromStorage();

// Listen for browser shutdown
chrome.runtime.onSuspend.addListener(() => {
  if (sessionStartTime) {
    const finalSessionTime = totalSessionTime + (Date.now() - sessionStartTime);
    const finalTotal = totalWatchTime + finalSessionTime;
    // Use synchronous storage to ensure it saves before browser closes
    chrome.storage.local.set({
      persistentTotalTime: finalTotal,
    });
  } else {
    chrome.storage.local.set({
      persistentTotalTime: totalWatchTime,
    });
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

function updateTotalWatchTime(additionalTime) {
  // Always get the latest total from storage before updating
  chrome.storage.local.get(["persistentTotalTime"], (result) => {
    const currentTotal = result.persistentTotalTime || 0;
    const newTotal = currentTotal + additionalTime;

    chrome.storage.local.set(
      {
        persistentTotalTime: newTotal,
      },
      () => {
        totalWatchTime = newTotal;
        console.log("Updated total watch time:", newTotal);
      }
    );
  });
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
    totalWatchTime,
  };

  chrome.storage.local.set({ trackingState: state });
}

function startPeriodicUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
  }

  updateTrackingState();

  updateTimer = setInterval(() => {
    updateTrackingState();
  }, 1000);
}

function stopPeriodicUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }

  if (sessionStartTime) {
    const additionalTime = Date.now() - sessionStartTime;
    totalSessionTime += additionalTime;
    sessionStartTime = null;

    // Update the total watch time with the final session time
    updateTotalWatchTime(totalSessionTime);
  }

  updateTrackingState();
}

function pauseTracking() {
  if (sessionStartTime) {
    const additionalTime = Date.now() - sessionStartTime;
    totalSessionTime += additionalTime;
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

      // Store the last session time
      chrome.storage.local.set({
        lastSession: totalSessionTime,
      });

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

// Update tab info when audio state changes
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

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (youtubeTabs.has(tabId)) {
    youtubeTabs.delete(tabId);
    checkYouTubeActivity();
  }
});

// Initial check of all tabs when extension loads
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
