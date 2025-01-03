console.log("Popup opened");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentUrl = tabs[0].url;
  const status = document.getElementById("status");
  status.textContent =
    currentUrl && currentUrl.includes("youtube.com")
      ? "On YouTube"
      : "Not on YouTube";
});
