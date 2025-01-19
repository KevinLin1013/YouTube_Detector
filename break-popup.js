document.getElementById("continueBtn").addEventListener("click", () => {
  // Send message to extend threshold and close popup
  chrome.runtime.sendMessage({ action: "continueWatching" });
  window.close();
});

document.getElementById("breakBtn").addEventListener("click", () => {
  // Send message to reset timer/threshold and close popup
  chrome.runtime.sendMessage({ action: "takeBreak" });
  window.close();
});
