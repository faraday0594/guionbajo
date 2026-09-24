/**
 * Guionbajo AI — Background Service Worker
 * 1. Fetches subtitle files via host_permissions (100% bypasses webpage CORS policies)
 * 2. Monitors network requests for Netflix timed text / subtitle files
 */

// 1. Cross-origin subtitle fetcher for content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "FETCH_SUBTITLE_FILE" && request.url) {
    fetch(request.url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        sendResponse({ success: true, text });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err ? err.toString() : "Fetch error" });
      });
    return true; // Keep message channel open for async response
  }
});

// 2. Intercepts specific subtitle track requests on *.nflxvideo.net
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!details.url || details.tabId < 0) return;

    const url = details.url.toLowerCase();
    // Exclude large video/audio stream chunks (range/... with ?o=1)
    const isVideoRange = url.includes("range/") && !url.includes("timedtext");
    if (isVideoRange) return;

    const isSubtitleCandidate =
      url.includes("nflxvideo.net") &&
      (url.includes("timedtext") ||
        url.includes("format=imsc1") ||
        url.includes("format=webvtt") ||
        url.includes("format=simplesdh") ||
        url.includes("format=dfxp") ||
        url.includes(".vtt") ||
        url.includes(".xml"));

    if (isSubtitleCandidate) {
      chrome.tabs.sendMessage(
        details.tabId,
        {
          action: "NETFLIX_SUBTITLE_TRACK_DETECTED",
          url: details.url,
        },
        () => {
          // Explicitly checking chrome.runtime.lastError prevents Chrome from logging
          // "Could not establish connection. Receiving end does not exist." in extension errors
          if (chrome.runtime.lastError) {
            // Tab closed or content script not ready; safely ignored
          }
        }
      );
    }
  },
  {
    urls: ["*://*.nflxvideo.net/*"],
  }
);
