function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours} hours ${minutes} minutes ${seconds} seconds`;
  }
  return `${minutes} minutes ${seconds} seconds`;
}

function updatePopup() {
  const status = document.getElementById("status");
  const currentSession = document.getElementById("currentSession");

  chrome.tabs.query({}, (tabs) => {
    const youtubeTabs = tabs.filter(
      (tab) => tab.url && tab.url.includes("youtube.com")
    );
    const hasPlayingTab = youtubeTabs.some((tab) => tab.audible);

    if (youtubeTabs.length > 0) {
      status.textContent = hasPlayingTab
        ? "YouTube is currently playing"
        : "YouTube is open but not playing";
    } else {
      status.textContent = "YouTube is not open";
    }

    chrome.storage.local.get(["trackingState"], (result) => {
      const { trackingState } = result;
      if (trackingState && trackingState.isTracking) {
        currentSession.textContent = `Current session: ${trackingState.currentSessionDuration}`;
      } else {
        currentSession.textContent = "";
      }
    });
  });
}
// debug button to trigger break
document.getElementById("debugButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "debugTriggerBreak" });
});

document.getElementById("breakThreshold").addEventListener("change", (e) => {
  const minutes = parseInt(e.target.value);
  if (minutes > 0) {
    chrome.storage.local.set({ breakThreshold: minutes });
  }
});

chrome.storage.local.get(["breakThreshold"], (result) => {
  if (result.breakThreshold) {
    document.getElementById("breakThreshold").value = result.breakThreshold;
  }
});

updatePopup();
const popupInterval = setInterval(updatePopup, 1000);

window.addEventListener("unload", () => {
  clearInterval(popupInterval);
});
