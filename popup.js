function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours} hours ${minutes} minutes ${seconds} seconds`;
  }
  return `${minutes} minutes ${seconds} seconds`;
}

function resetAllData() {
  // Clear all stored data
  chrome.storage.local.clear(() => {
    // Reload the popup
    window.location.reload();
  });
}

function updatePopup() {
  const status = document.getElementById("status");
  const currentSession = document.getElementById("currentSession");
  const lastSession = document.getElementById("lastSession");
  const totalTime = document.getElementById("totalTime");

  // Get current tabs state
  chrome.tabs.query({}, (tabs) => {
    const youtubeTabs = tabs.filter(
      (tab) => tab.url && tab.url.includes("youtube.com")
    );
    const hasPlayingTab = youtubeTabs.some((tab) => tab.audible);

    // Update status message
    if (youtubeTabs.length > 0) {
      if (hasPlayingTab) {
        status.textContent = "YouTube is currently playing";
      } else {
        status.textContent = "YouTube is open but not playing";
      }
    } else {
      status.textContent = "YouTube is not open";
    }

    // Get tracking state and update time information
    chrome.storage.local.get(
      ["trackingState", "lastSession", "persistentTotalTime"],
      (result) => {
        const { trackingState, lastSession, persistentTotalTime = 0 } = result;

        if (trackingState && trackingState.isTracking) {
          currentSession.textContent = `Current session: ${trackingState.currentSessionDuration}`;

          // Calculate and display total including current session
          const total = persistentTotalTime + trackingState.totalSessionTime;
          totalTime.textContent = `Total watch time: ${formatDuration(total)}`;
        } else {
          currentSession.textContent = "";
          totalTime.textContent = `Total watch time: ${formatDuration(
            persistentTotalTime
          )}`;
        }

        if (lastSession) {
          lastSession.textContent = `Last session: ${formatDuration(
            lastSession
          )}`;
        }
      }
    );
  });
}

// Update immediately when popup opens
updatePopup();

// Update every second while popup is open
const popupInterval = setInterval(updatePopup, 1000);

// Add reset button handler
document.getElementById("resetButton").addEventListener("click", () => {
  if (
    confirm(
      "Are you sure you want to reset all time data? This cannot be undone."
    )
  ) {
    resetAllData();
  }
});

// Cleanup interval when popup closes
window.addEventListener("unload", () => {
  clearInterval(popupInterval);
});
