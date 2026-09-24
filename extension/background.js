/**
 * Guionbajo AI — Background Service Worker
 * Intercepts Netflix timed text / subtitle requests on *.nflxvideo.net
 * and sends the signed subtitle URLs to content.js for full-script extraction.
 */

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!details.url || details.tabId < 0) return;

    const url = details.url.toLowerCase();
    const isSubtitleCandidate =
      url.includes("nflxvideo.net") &&
      (url.includes("?o=") ||
        url.includes("timedtext") ||
        url.includes("format=imsc1") ||
        url.includes("format=webvtt") ||
        url.includes("simplesdh") ||
        url.includes("dfxp") ||
        url.includes("range/"));

    if (isSubtitleCandidate) {
      chrome.tabs.sendMessage(details.tabId, {
        action: "NETFLIX_SUBTITLE_TRACK_DETECTED",
        url: details.url,
      }).catch(() => {
        // Tab may not be ready or closed
      });
    }
  },
  {
    urls: ["*://*.nflxvideo.net/*"],
  }
);
