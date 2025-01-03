console.log("Popup opened");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentUrl = tabs[0].url;
  const status = document.getElementById("status");

  if (currentUrl && currentUrl.includes("youtube.com")) {
    status.textContent = "On YouTube";
  } else {
    status.textContent = "Not on YouTube";
  }
});
