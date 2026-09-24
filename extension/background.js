/**
 * Guionbajo AI — Background Service Worker
 * 1. Fetches subtitle files via host_permissions (100% bypasses webpage CORS policies)
 * 2. Monitors network requests for Netflix timed text / subtitle files
 */

// 1. Cross-origin subtitle fetcher & API proxy for content.js
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

  // Generic API proxy: bypasses Chrome Private Network Access (PNA) and webpage CORS
  if (request && request.action === "API_PROXY" && request.url) {
    const opts = request.options || {};
    fetch(request.url, opts)
      .then(async (res) => {
        const contentType = res.headers.get("content-type") || "";
        let data;
        if (contentType.includes("application/json")) {
          data = await res.json().catch(() => null);
        } else {
          data = await res.text().catch(() => "");
        }
        sendResponse({
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          data: data,
        });
      })
      .catch((err) => {
        sendResponse({
          ok: false,
          status: 0,
          statusText: "Network Error",
          error: err ? err.toString() : "Unknown network error",
        });
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
