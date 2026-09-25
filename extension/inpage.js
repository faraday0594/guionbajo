/**
 * Guionbajo AI — In-Page Hook (Runs in world: "MAIN")
 * Directly accesses window.netflix Player API and intercepts manifest timedtexttracks
 * to capture the 100% complete subtitle track of the video immediately when opened.
 */
(function () {
  if (window.__guionbajoInpageLoaded) return;
  window.__guionbajoInpageLoaded = true;

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

  // 1. Hook JSON.parse to intercept incoming Netflix manifests in real-time
  const origParse = JSON.parse;
  JSON.parse = function () {
    const data = origParse.apply(this, arguments);
    try {
      if (data && typeof data === "object") {
        const tracks =
          data.result?.timedtexttracks ||
          data.result?.timedTextTracks ||
          data.timedtexttracks ||
          data.timedTextTracks;
        if (tracks && Array.isArray(tracks) && tracks.length > 0) {
          broadcastTracks(tracks, data.result?.movieId || data.movieId);
        }
      }
    } catch (_) {}
    return data;
  };

  // 2. Direct Player API hook: inspects window.netflix Cadmium Player
  function queryPlayerApi() {
    try {
      const netflixObj = window.netflix;
      if (!netflixObj) return false;

      // Cadmium Player v2 API Path
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

  // 3. Listen for requests and metadata sync from content.js
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

  // 4. Expose Global Subtitle Inspector directly in DevTools console (top window)
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
        "[Guionbajo AI] ⚠️ Aún no se han capturado diálogos. Asegúrate de reproducir el video con subtítulos en inglés durante 2 segundos."
      );
      queryPlayerApi();
    }

    // Instruct content.js to display visual modal
    window.postMessage({ source: "guionbajo_inpage", action: "OPEN_SUBTITLE_INSPECTOR" }, "*");
    return cachedSubtitlesMeta;
  };

  // 5. Polling check during initial player load (first 15 seconds)
  let attempts = 0;
  const pollInterval = setInterval(() => {
    attempts++;
    const found = queryPlayerApi();
    if (found || attempts > 30) {
      clearInterval(pollInterval);
    }
  }, 500);

  // 6. Check on route changes (Netflix SPA navigation between episodes)
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

  // 7. Check when HTML5 video element is found or starts playing
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
