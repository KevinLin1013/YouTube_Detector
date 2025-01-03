console.log("Popup opened");

// Function to update current time
function updateCurrentTime(currentTimeDiv) {
  currentTimeDiv.textContent =
    "Current time: " + new Date().toLocaleTimeString();
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentUrl = tabs[0].url;
  const status = document.getElementById("status");

  if (currentUrl && currentUrl.includes("youtube.com")) {
    status.textContent = "On YouTube";

    // Get YouTube opened time from storage
    chrome.storage.local.get(["youtubeOpenedTime"], (result) => {
      // Create div for YouTube opened time
      const openedTimeDiv = document.createElement("div");
      if (result.youtubeOpenedTime) {
        const openedTime = new Date(
          result.youtubeOpenedTime
        ).toLocaleTimeString();
        openedTimeDiv.textContent = "YouTube opened at: " + openedTime;
        console.log("YouTube was first opened at:", openedTime);
      } else {
        openedTimeDiv.textContent = "YouTube opened time not available";
        console.log("No YouTube opened time found in storage");
      }
      status.appendChild(openedTimeDiv);

      // Create and update current time div
      const currentTimeDiv = document.createElement("div");
      status.appendChild(currentTimeDiv);

      // Update current time immediately and every second
      updateCurrentTime(currentTimeDiv);
      setInterval(() => updateCurrentTime(currentTimeDiv), 1000);
    });
  } else {
    status.textContent = "Not on YouTube";
  }
});
