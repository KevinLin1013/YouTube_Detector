let isOnYouTube = false;

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const wasOnYouTube = isOnYouTube;
    isOnYouTube = tab.url.includes("youtube.com");

    if (!wasOnYouTube && isOnYouTube) {
      const youtubeOpenedTime = Date.now();
      chrome.storage.local.set({ youtubeOpenedTime: youtubeOpenedTime }, () => {
        console.log(
          "YouTube opened at:",
          new Date(youtubeOpenedTime).toLocaleTimeString()
        );
      });
    }
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      const wasOnYouTube = isOnYouTube;
      isOnYouTube = tab.url.includes("youtube.com");

      if (!wasOnYouTube && isOnYouTube) {
        const youtubeOpenedTime = Date.now();
        chrome.storage.local.set(
          { youtubeOpenedTime: youtubeOpenedTime },
          () => {
            console.log(
              "YouTube opened at:",
              new Date(youtubeOpenedTime).toLocaleTimeString()
            );
          }
        );
      }
    }
  });
});
