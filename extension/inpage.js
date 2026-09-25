/**
 * Guionbajo AI — In-Page Hook (Runs in world: "MAIN")
 * Directly accesses window.netflix Player API, hooks manifest network serialization (JSON.stringify),
 * response parsing (JSON.parse / fetch / XHR), and intercepts timedtexttracks / textTracks
 * to capture the 100% complete subtitle track of the entire episode upfront immediately when opened.
 */
(function () {
  if (window.__guionbajoInpageLoaded) return;
  window.__guionbajoInpageLoaded = true;

  const ALL_SUBTITLE_PROFILES = [
    "webvtt-lssdh-ios8",
    "dfxp-ls-sdh",
    "simplesdh",
    "imsc1.1"
  ];
  const MANIFEST_URL_REGEX = /manifest|licensedManifest/i;

  let cachedSubtitlesMeta = {
    showTitle: "",
    episodeTitle: "",
    totalLines: 0,
    sampleLines: [],
  };

  function broadcastTracks(timedTextTracks, movieId = null) {
    if (!timedTextTracks || !Array.isArray(timedTextTracks) || timedTextTracks.length === 0) return;

    window.postMessage(
      {
        source: "guionbajo_inpage",
        type: "NETFLIX_SUBTITLES_MANIFEST",
        result: {
          timedtexttracks: timedTextTracks,
          movieId: movieId,
        },
      },
      "*"
    );
  }

  // 1. Hook JSON.stringify: Injects full subtitle profiles (WebVTT, DFXP) into outgoing Netflix manifest requests.
  // This instructs Netflix servers to return the full downloadable subtitle URLs in ttDownloadables.
  const origStringify = JSON.stringify;
  JSON.stringify = function (data) {
    if (data && typeof data === "object") {
      try {
        const isManifestRequest =
          (typeof data.url === "string" && MANIFEST_URL_REGEX.test(data.url)) ||
          (data.params && typeof data.params === "object") ||
          (data.profiles && Array.isArray(data.profiles));

        if (isManifestRequest) {
          const injectProfiles = (obj) => {
            if (!obj || typeof obj !== "object") return;
            if (Array.isArray(obj.profiles)) {
              for (const p of ALL_SUBTITLE_PROFILES) {
                if (!obj.profiles.includes(p)) {
                  obj.profiles.unshift(p);
                }
              }
            }
            for (const k of Object.keys(obj)) {
              if (obj[k] && typeof obj[k] === "object") {
                injectProfiles(obj[k]);
              }
            }
          };
          injectProfiles(data);
        }
      } catch (_) {}
    }
    return origStringify.apply(this, arguments);
  };

  // 2. Hook JSON.parse: Intercepts incoming manifest JSON responses from Netflix
  const origParse = JSON.parse;
  JSON.parse = function () {
    const data = origParse.apply(this, arguments);
    try {
      if (data && typeof data === "object") {
        const res = data.result || data;
        const tracks =
          res.timedtexttracks ||
          res.textTracks ||
          res.timedTextTracks;
        if (tracks && Array.isArray(tracks) && tracks.length > 0) {
          broadcastTracks(tracks, res.movieId || data.movieId);
        }
      }
    } catch (_) {}
    return data;
  };

  // 3. Hook window.fetch: Intercepts streaming manifest responses in case Response.json() is used
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : (args[0]?.url || "");
      if (MANIFEST_URL_REGEX.test(url)) {
        const cloned = response.clone();
        cloned.json().then((data) => {
          if (data && typeof data === "object") {
            const res = data.result || data;
            const tracks =
              res.timedtexttracks ||
              res.textTracks ||
              res.timedTextTracks;
            if (tracks && Array.isArray(tracks) && tracks.length > 0) {
              broadcastTracks(tracks, res.movieId || data.movieId);
            }
          }
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  // 4. Hook XMLHttpRequest: Intercepts XHR manifest loads
  const origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    const url = args[1] || "";
    if (typeof url === "string" && MANIFEST_URL_REGEX.test(url)) {
      this.addEventListener("load", function () {
        try {
          let text = this.response;
          if (typeof text === "string") {
            const data = origParse(text);
            const res = data.result || data;
            const tracks =
              res.timedtexttracks ||
              res.textTracks ||
              res.timedTextTracks;
            if (tracks && Array.isArray(tracks) && tracks.length > 0) {
              broadcastTracks(tracks, res.movieId || data.movieId);
            }
          }
        } catch (_) {}
      });
    }
    return origXhrOpen.apply(this, args);
  };

  // 5. Direct Player API hook: inspects window.netflix Cadmium Player
  function queryPlayerApi() {
    try {
      const netflixObj = window.netflix;
      if (!netflixObj) return false;

      const playerApp = netflixObj.appContext?.state?.playerApp;
      const videoPlayer =
        playerApp?.getAPI?.()?.videoPlayer ||
        netflixObj.player?.getAPI?.()?.videoPlayer ||
        netflixObj.cadmium?.objects?.videoPlayer;

      if (!videoPlayer) return false;

      const sessionIds = videoPlayer.getAllPlayerSessionIds ? videoPlayer.getAllPlayerSessionIds() : [];
      for (const sid of sessionIds) {
        const player = videoPlayer.getVideoPlayerBySessionId(sid);
        if (player) {
          const movieId = player.getMovieId ? player.getMovieId() : null;

          // Method A: getTimedTextTrackList
          if (typeof player.getTimedTextTrackList === "function") {
            const list = player.getTimedTextTrackList();
            if (list && list.length > 0) {
              broadcastTracks(list, movieId);
              return true;
            }
          }

          // Method B: getTextTrackList
          if (typeof player.getTextTrackList === "function") {
            const list = player.getTextTrackList();
            if (list && list.length > 0) {
              broadcastTracks(list, movieId);
              return true;
            }
          }
        }
      }
    } catch (e) {
      // Player might still be booting up
    }
    return false;
  }

  // 6. Listen for requests and metadata sync from content.js
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data) return;
    if (e.data.source === "guionbajo_content") {
      if (e.data.action === "REQUEST_SUBTITLES") {
        queryPlayerApi();
      } else if (e.data.action === "SYNC_SUBTITLES_INFO") {
        cachedSubtitlesMeta = {
          showTitle: e.data.showTitle,
          episodeTitle: e.data.episodeTitle,
          totalLines: e.data.totalLines,
          sampleLines: e.data.sampleLines || [],
        };
      }
    }
  });

  // 7. Expose Global Subtitle Inspector directly in DevTools console (top window)
  window.__gb_ver_subtitulos = function () {
    console.log(
      "%c[Guionbajo AI] 🎬 INSPECTOR DE SUBTÍTULOS EN TIEMPO REAL",
      "color:#38bdf8; font-size:14px; font-weight:bold; padding:4px 0;"
    );
    console.log(`📺 Serie / Película: %c${cachedSubtitlesMeta.showTitle || document.title}`, "font-weight:bold; color:#f59e0b;");
    console.log(`📊 Diálogos capturados en memoria: %c${cachedSubtitlesMeta.totalLines} líneas`, "font-weight:bold; color:#10b981;");

    if (cachedSubtitlesMeta.sampleLines && cachedSubtitlesMeta.sampleLines.length > 0) {
      console.log("%c▼ Muestra de los primeros diálogos capturados del archivo oficial:", "color:#10b981; font-weight:bold;");
      console.table(
        cachedSubtitlesMeta.sampleLines.slice(0, 25).map((l, i) => ({ Línea: i + 1, Diálogo: l }))
      );
    } else {
      console.warn(
        "[Guionbajo AI] ⚠️ Aún no se han capturado diálogos completos. Si ya tenías el video abierto, recarga la pestaña con F5 para que Netflix descargue el archivo oficial de subtítulos."
      );
      queryPlayerApi();
    }

    // Instruct content.js to display visual modal
    window.postMessage({ source: "guionbajo_inpage", action: "OPEN_SUBTITLE_INSPECTOR" }, "*");
    return cachedSubtitlesMeta;
  };

  // 8. Polling check during initial player load (first 15 seconds)
  let attempts = 0;
  const pollInterval = setInterval(() => {
    attempts++;
    const found = queryPlayerApi();
    if (found || attempts > 30) {
      clearInterval(pollInterval);
    }
  }, 500);

  // 9. Check on route changes (Netflix SPA navigation between episodes)
  window.addEventListener("popstate", () => {
    setTimeout(queryPlayerApi, 1000);
  });

  const origPushState = history.pushState;
  history.pushState = function () {
    const res = origPushState.apply(this, arguments);
    setTimeout(queryPlayerApi, 800);
    return res;
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    const res = origReplaceState.apply(this, arguments);
    setTimeout(queryPlayerApi, 800);
    return res;
  };

  // 10. Check when HTML5 video element is found or starts playing
  setInterval(() => {
    const video = document.querySelector("video");
    if (video && !video.__gb_hooked) {
      video.__gb_hooked = true;
      video.addEventListener("play", () => setTimeout(queryPlayerApi, 400));
      video.addEventListener("loadedmetadata", () => setTimeout(queryPlayerApi, 400));
      queryPlayerApi();
    }
  }, 1000);
})();
