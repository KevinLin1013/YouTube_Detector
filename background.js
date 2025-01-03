let isOnYouTube = false;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    isOnYouTube = tab.url && tab.url.includes("youtube.com");
    console.log("Is on YouTube:", isOnYouTube);
  } catch (error) {
    console.error("Error:", error);
  }
});
