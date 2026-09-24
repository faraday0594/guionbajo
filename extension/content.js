/**
 * Guionbajo AI — Netflix Companion Content Script (v2.5)
 * Injected into netflix.com playback pages.
 * Features:
 * - Anti-duplication subtitle parsing (leaf spans only + cleanSubtitleDeduplication)
 * - Mandatory Guionbajo Student Authentication (JWT security)
 * - 2 Distinct Learning Modes:
 *   1. 🎮 Modo Aprendizaje Libre (Inmersión directa, pausa con Q para dudas en vivo)
 *   2. 🎓 Modo Clase Previa (10-15 expresiones + tiempos verbales + quiz + rebobinado a 00:00 automático)
 * - Auto-rewind and start playback from beginning (video.currentTime = 0; video.play())
 */

(function () {
  console.log("%c[Guionbajo AI]%c Netflix Companion v2.5 activo 🎬", "color:#10b981;font-weight:bold", "color:#fff");

  const DEFAULT_API_URL = "http://localhost:8000";
  let activeAudio = null;
  let subtitleHistory = [];
  let currentSubtitle = "";
  let isModalOpen = false;
  let currentMode = null; // null | 'free' | 'masterclass'
  let cachedMasterclass = null;

  // Retrieve student settings and credentials from chrome.storage
  async function getSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(
          ["apiUrl", "studentLevel", "voiceId", "autoPlayVoice", "authToken", "userName", "userEmail", "preferredMode"],
          (items) => {
            resolve({
              apiUrl: (items.apiUrl || DEFAULT_API_URL).replace(/\/$/, ""),
              studentLevel: items.studentLevel || "B1",
              voiceId: items.voiceId || "es-US-AlonsoNeural",
              autoPlayVoice: items.autoPlayVoice !== false,
              authToken: items.authToken || "",
              userName: items.userName || "",
              userEmail: items.userEmail || "",
              preferredMode: items.preferredMode || null,
            });
          }
        );
      } else {
        resolve({
          apiUrl: DEFAULT_API_URL,
          studentLevel: "B1",
          voiceId: "es-US-AlonsoNeural",
          autoPlayVoice: true,
          authToken: "",
          userName: "",
          userEmail: "",
          preferredMode: null,
        });
      }
    });
  }

  // 1. Locate Netflix HTML5 video element
  function getNetflixVideo() {
    return document.querySelector("video");
  }

  // 2. Strict Anti-Duplication Text Cleaner
  function cleanSubtitleDeduplication(rawText) {
    if (!rawText) return "";
    let clean = rawText.replace(/\s+/g, " ").trim();

    // Catch full-sentence duplication (e.g. "Phrase A Phrase A")
    const len = clean.length;
    const half = Math.floor(len / 2);
    for (let offset = -4; offset <= 4; offset++) {
      const splitIdx = half + offset;
      if (splitIdx > 3 && splitIdx < len) {
        const left = clean.substring(0, splitIdx).trim();
        const right = clean.substring(splitIdx).trim();
        if (left.toLowerCase() === right.toLowerCase()) {
          return left;
        }
      }
    }

    // Catch repeated clauses/consecutive words
    clean = clean.replace(/\b([a-zA-Z0-9',.\- ]{6,}?)\s+\1\b/gi, "$1");
    return clean.trim();
  }

  // 3. Read live subtitles from Netflix timedtext DOM container
  function readCurrentSubtitle() {
    const container = document.querySelector(".player-timedtext");
    if (!container) return "";

    const rawLines = [];
    const textContainers = container.querySelectorAll(".player-timedtext-text-container");

    if (textContainers && textContainers.length > 0) {
      textContainers.forEach((tc) => {
        // Select ONLY leaf spans (spans that do NOT contain other spans to prevent shadow/parent duplication)
        const leafSpans = Array.from(tc.querySelectorAll("span")).filter(
          (s) => s.children.length === 0 && s.textContent.trim().length > 0
        );
        const lineText = leafSpans.map((s) => s.textContent.trim()).join(" ");
        if (lineText) {
          rawLines.push(lineText);
        }
      });
    } else {
      const leafSpans = Array.from(container.querySelectorAll("span")).filter(
        (s) => s.children.length === 0 && s.textContent.trim().length > 0
      );
      leafSpans.forEach((s) => {
        const t = s.textContent.trim();
        if (t) rawLines.push(t);
      });
    }

    const uniqueLines = [];
    for (const l of rawLines) {
      const cleaned = cleanSubtitleDeduplication(l);
      if (cleaned && !uniqueLines.includes(cleaned)) {
        uniqueLines.push(cleaned);
      }
    }

    const joined = uniqueLines.join(" ").replace(/\s+/g, " ").trim();
    return cleanSubtitleDeduplication(joined);
  }

  // 4. Subtitle buffer observer (collects dialogue context for Masterclass)
  setInterval(() => {
    const text = readCurrentSubtitle();
    if (text && text !== currentSubtitle) {
      currentSubtitle = text;
      if (!subtitleHistory.includes(text)) {
        subtitleHistory.push(text);
        if (subtitleHistory.length > 60) subtitleHistory.shift();
      }
    }
  }, 350);

  // 5. Inject Floating Launcher Badge
  function injectLauncher() {
    if (document.getElementById("gb-netflix-launcher")) return;

    const launcher = document.createElement("div");
    launcher.id = "gb-netflix-launcher";
    launcher.innerHTML = `
      <div class="gb-launcher-dot"></div>
      <span class="gb-launcher-title">Guionbajo AI</span>
      <span class="gb-launcher-key">Q</span>
    `;

    launcher.addEventListener("click", () => {
      triggerCompanion();
    });

    document.body.appendChild(launcher);
  }

  // 5.5 Guionbajo Robot Avatar Component Generator
  function buildGuionbajoAvatarHtml(avatarId = "gb-tutor-avatar", size = "normal") {
    const isMini = size === "mini";
    return `
      <div class="gb-avatar-wrapper ${isMini ? "gb-avatar-mini" : ""}" id="${avatarId}" title="Guionbajo AI Tutor">
        <div class="gb-robot-head">
          <div class="gb-robot-antenna">
            <div class="gb-antenna-stem"></div>
            <div class="gb-vacuum-bulb">
              <div class="gb-bulb-filament"></div>
            </div>
          </div>
          <div class="gb-ear-dial gb-ear-left"><div class="gb-dial-notch"></div></div>
          <div class="gb-ear-dial gb-ear-right"><div class="gb-dial-notch"></div></div>
          <div class="gb-rivet gb-r-tl"></div>
          <div class="gb-rivet gb-r-tr"></div>
          <div class="gb-rivet gb-r-bl"></div>
          <div class="gb-rivet gb-r-br"></div>
          <div class="gb-robot-eyes">
            <div class="gb-eye-socket">
              <div class="gb-shutter-top"></div>
              <div class="gb-eye-lens">
                <div class="gb-pupil"></div>
                <div class="gb-eye-glint"></div>
              </div>
            </div>
            <div class="gb-eye-socket">
              <div class="gb-shutter-top"></div>
              <div class="gb-eye-lens">
                <div class="gb-pupil"></div>
                <div class="gb-eye-glint"></div>
              </div>
            </div>
          </div>
          <div class="gb-mouth-frame">
            <div class="gb-terminal-cursor">_</div>
            <div class="gb-teeth-grille">
              <div class="gb-tooth-bar"></div>
              <div class="gb-tooth-bar"></div>
              <div class="gb-tooth-bar"></div>
              <div class="gb-tooth-bar"></div>
              <div class="gb-tooth-bar"></div>
              <div class="gb-tooth-bar"></div>
              <div class="gb-tooth-bar"></div>
            </div>
          </div>
        </div>
        <div class="gb-robot-body">
          <div class="gb-robot-arm gb-arm-left"></div>
          <div class="gb-robot-arm gb-arm-right"></div>
          <div class="gb-crt-monitor">
            <div class="gb-crt-scanlines"></div>
            <div class="gb-crt-content">
              <span class="gb-crt-idle-text">^_^</span>
              <div class="gb-crt-eq">
                <div class="gb-crt-bar"></div>
                <div class="gb-crt-bar"></div>
                <div class="gb-crt-bar"></div>
              </div>
            </div>
          </div>
          <div class="gb-hover-thruster">
            <div class="gb-thruster-nozzle"></div>
            <div class="gb-plasma-flame"></div>
          </div>
        </div>
      </div>
    `;
  }

  function setAvatarSpeakingState(avatarId, isSpeaking) {
    const el = document.getElementById(avatarId);
    if (el) {
      if (isSpeaking) {
        el.classList.add("gb-speaking");
      } else {
        el.classList.remove("gb-speaking");
      }
    }
  }

  // 6. Build and inject Tutor Modal Overlay
  function ensureModal() {
    let modal = document.getElementById("gb-companion-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "gb-companion-modal";
    modal.style.display = "none";

    modal.innerHTML = `
      <div class="gb-modal-header">
        <div class="gb-brand-group">
          ${buildGuionbajoAvatarHtml("gb-header-avatar", "mini")}
          <span class="gb-brand-name">Guionbajo AI</span>
          <span class="gb-student-chip" id="gb-header-student-tag" style="display:none;">Estudiante</span>
          <button class="gb-switch-mode-chip" id="gb-switch-mode-btn" style="display:none;">🔄 Cambiar Modo</button>
        </div>
        <button class="gb-close-btn" id="gb-modal-close" title="Cerrar (Esc)">&times;</button>
      </div>

      <!-- TABS NAVIGATION (Visible when in normal operation) -->
      <div class="gb-tabs-nav" id="gb-tabs-nav" style="display:none;">
        <button class="gb-tab-btn active" id="gb-tab-scene-btn">⚡ Escena en Vivo [Q]</button>
        <button class="gb-tab-btn" id="gb-tab-mc-btn">📚 Clase Maestra del Capítulo</button>
      </div>

      <div class="gb-modal-body" id="gb-modal-body">
        <!-- VIEW 0: AUTH LOCKED -->
        <div id="gb-view-auth-locked" style="display:none;">
          <div class="gb-auth-locked-card">
            <div class="gb-auth-icon">🔒</div>
            <h3 class="gb-auth-title">Acceso Exclusivo para Estudiantes</h3>
            <p class="gb-auth-text">
              Para usar el AI Tutor en Netflix debes tener una cuenta activa de <b>Guionbajo</b>. Inicia sesión para desbloquear tu experiencia:
            </p>
            <form class="gb-login-inline-form" id="gb-inline-login-form">
              <input type="email" class="gb-login-input" id="gb-inline-email" placeholder="Correo (ej: megafer1994@gmail.com)" required>
              <input type="password" class="gb-login-input" id="gb-inline-password" placeholder="Contraseña" required>
              <div class="gb-login-err" id="gb-inline-login-err"></div>
              <button type="submit" class="gb-login-btn" id="gb-inline-login-btn">Iniciar Sesión y Desbloquear</button>
            </form>
          </div>
        </div>

        <!-- VIEW 1: MODE SELECTION (Free vs Masterclass Pre-Watch) -->
        <div id="gb-view-mode-selection" style="display:none;">
          <div class="gb-mode-selection-container">
            <div class="gb-mode-header">
              <div class="gb-mode-main-title">¿Cómo quieres aprender hoy?</div>
              <div class="gb-mode-main-sub">Selecciona el modo que prefieras para esta sesión de Netflix:</div>
            </div>

            <div class="gb-modes-grid">
              <!-- OPTION A: MODO LIBRE -->
              <div class="gb-mode-card" id="gb-card-mode-free">
                <div class="gb-mode-top-row">
                  <div class="gb-mode-icon-title">
                    <span class="gb-mode-icon">🎮</span>
                    <div>
                      <div class="gb-mode-title">1. Aprendizaje Libre</div>
                      <div style="font-size:11px; color:#94a3b8;">Inmersión directa sin clase previa</div>
                    </div>
                  </div>
                </div>
                <div class="gb-mode-desc">
                  Empieza a ver tu película o serie de inmediato. Si en algún momento no entiendes una frase, modismo o diálogo, presiona la tecla <b>[Q]</b> para pausar y preguntarle al tutor en tiempo real.
                </div>
                <div class="gb-mode-features-list">
                  <span class="gb-mode-feature-tag">⚡ Sin interrupciones iniciales</span>
                  <span class="gb-mode-feature-tag">🎙️ Pregunta en vivo</span>
                  <span class="gb-mode-feature-tag">🍿 Disfrute directo</span>
                </div>
                <button class="gb-mode-select-btn gb-btn-free-mode" id="gb-btn-choose-free">
                  ▶ Empezar a ver ahora en Modo Libre
                </button>
              </div>

              <!-- OPTION B: CLASE PREVIA / MASTERCLASS -->
              <div class="gb-mode-card recommended" id="gb-card-mode-masterclass">
                <div class="gb-mode-top-row">
                  <div class="gb-mode-icon-title">
                    <span class="gb-mode-icon">🎓</span>
                    <div>
                      <div class="gb-mode-title">2. Clase Previa con Vocabulario</div>
                      <div style="font-size:11px; color:#38bdf8;">10 a 15 expresiones + Tiempos verbales</div>
                    </div>
                  </div>
                  <span class="gb-mode-badge-rec">Recomendado</span>
                </div>
                <div class="gb-mode-desc">
                  Aprende primero los <b>10 a 15 Phrasal Verbs, Idioms y tiempos verbales clave</b> que escucharás en este capítulo. Al final harás un <b>quiz de comprobación</b> y el sistema <b>iniciará el video desde el principio (00:00) automáticamente</b>.
                </div>
                <div class="gb-mode-features-list">
                  <span class="gb-mode-feature-tag">📖 10-15 Phrasal verbs & Idioms</span>
                  <span class="gb-mode-feature-tag">⏳ Gramática en escena</span>
                  <span class="gb-mode-feature-tag">🎯 Quiz interactivo</span>
                  <span class="gb-mode-feature-tag">🎬 Rebobinado automático</span>
                </div>
                <button class="gb-mode-select-btn gb-btn-mc-mode" id="gb-btn-choose-mc">
                  ✨ Iniciar Clase Previa (Recomendado)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW 2: SCENE TUTOR (LIVE [Q] MODE) -->
        <div id="gb-view-scene" style="display:none;">
          <div class="gb-sub-card">
            <div class="gb-sub-label">Subtítulo en Escena</div>
            <div class="gb-sub-text" id="gb-modal-sub-text">"Pausado..."</div>
          </div>

          <div class="gb-chips-row">
            <button class="gb-chip-btn" id="gb-chip-explain">⚡ Explicar modismo / frase</button>
            <button class="gb-chip-btn" id="gb-chip-grammar">⏳ ¿Qué tiempo verbal es?</button>
            <button class="gb-chip-btn" id="gb-chip-repeat">🗣️ Repetir Audio</button>
          </div>

          <div id="gb-response-container">
            <!-- Dynamic AI Response or Loading spinner injected here -->
          </div>

          <form class="gb-question-form" id="gb-custom-form">
            <input type="text" class="gb-question-input" id="gb-custom-input" placeholder="¿Tienes otra duda sobre esta frase?...">
            <button type="submit" class="gb-send-btn">Preguntar</button>
          </form>
        </div>

        <!-- VIEW 3: MASTERCLASS (PRE-WATCH BRIEFING) -->
        <div id="gb-view-masterclass" style="display:none;">
          <div class="gb-masterclass-container" id="gb-masterclass-container">
            <div id="gb-mc-results-container">
              <!-- Rendered masterclass content will appear here -->
            </div>
          </div>
        </div>
      </div>

      <div class="gb-modal-footer">
        <span class="gb-footer-hint">Presiona [Espacio] o [Esc] para reanudar</span>
        <button class="gb-resume-btn" id="gb-resume-btn">▶ Reanudar Serie</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind event listeners
    document.getElementById("gb-modal-close").addEventListener("click", closeModal);
    document.getElementById("gb-resume-btn").addEventListener("click", () => {
      closeModal();
      const video = getNetflixVideo();
      if (video) video.play();
    });

    // Switch Mode Button in header
    document.getElementById("gb-switch-mode-btn").addEventListener("click", () => {
      showModeSelection();
    });

    // Mode Selection Buttons
    document.getElementById("gb-btn-choose-free").addEventListener("click", () => {
      selectMode("free");
    });
    document.getElementById("gb-card-mode-free").addEventListener("click", (e) => {
      if (e.target.id !== "gb-btn-choose-free") selectMode("free");
    });

    document.getElementById("gb-btn-choose-mc").addEventListener("click", () => {
      selectMode("masterclass");
    });
    document.getElementById("gb-card-mode-masterclass").addEventListener("click", (e) => {
      if (e.target.id !== "gb-btn-choose-mc") selectMode("masterclass");
    });

    // Tab buttons
    document.getElementById("gb-tab-scene-btn").addEventListener("click", () => switchActiveTab("scene"));
    document.getElementById("gb-tab-mc-btn").addEventListener("click", () => switchActiveTab("masterclass"));

    // Quick chips
    document.getElementById("gb-chip-explain").addEventListener("click", () => {
      querySceneAnalysis("Explica el modismo, phrasal verb o expresión principal.");
    });

    document.getElementById("gb-chip-grammar").addEventListener("click", () => {
      querySceneAnalysis("¿A qué tiempo verbal pertenece esta frase y por qué el personaje la dijo así?");
    });

    document.getElementById("gb-chip-repeat").addEventListener("click", () => {
      if (activeAudio) {
        activeAudio.currentTime = 0;
        activeAudio.play();
      }
    });

    // Custom question form
    document.getElementById("gb-custom-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("gb-custom-input");
      const q = input.value.trim();
      if (q) {
        querySceneAnalysis(q);
        input.value = "";
      }
    });

    // Inline login form
    document.getElementById("gb-inline-login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      handleInlineLogin();
    });

    return modal;
  }

  // 7. Navigation & View Switchers
  function hideAllViews() {
    document.getElementById("gb-view-auth-locked").style.display = "none";
    document.getElementById("gb-view-mode-selection").style.display = "none";
    document.getElementById("gb-view-scene").style.display = "none";
    document.getElementById("gb-view-masterclass").style.display = "none";
  }

  function showModeSelection() {
    hideAllViews();
    document.getElementById("gb-view-mode-selection").style.display = "block";
    document.getElementById("gb-tabs-nav").style.display = "none";
    document.getElementById("gb-switch-mode-btn").style.display = "none";
  }

  function selectMode(mode) {
    currentMode = mode;
    document.getElementById("gb-switch-mode-btn").style.display = "inline-block";

    if (mode === "free") {
      // Free Mode: close modal and let student watch immediately
      closeModal();
      const video = getNetflixVideo();
      if (video) video.play();
    } else if (mode === "masterclass") {
      // Masterclass Mode: pause video, generate class and present it immediately
      const video = getNetflixVideo();
      if (video && !video.paused) video.pause();

      hideAllViews();
      document.getElementById("gb-tabs-nav").style.display = "flex";
      document.getElementById("gb-tab-scene-btn").classList.remove("active");
      document.getElementById("gb-tab-mc-btn").classList.add("active");
      document.getElementById("gb-view-masterclass").style.display = "block";

      generateFullMasterclass();
    }
  }

  function switchActiveTab(tab) {
    hideAllViews();
    const sceneBtn = document.getElementById("gb-tab-scene-btn");
    const mcBtn = document.getElementById("gb-tab-mc-btn");

    if (tab === "scene") {
      sceneBtn.classList.add("active");
      mcBtn.classList.remove("active");
      document.getElementById("gb-view-scene").style.display = "block";
    } else {
      sceneBtn.classList.remove("active");
      mcBtn.classList.add("active");
      document.getElementById("gb-view-masterclass").style.display = "block";
      if (!cachedMasterclass) {
        generateFullMasterclass();
      } else {
        renderMasterclass(cachedMasterclass);
      }
    }
  }

  // 8. Inline Login Handler
  async function handleInlineLogin() {
    const emailInput = document.getElementById("gb-inline-email");
    const passInput = document.getElementById("gb-inline-password");
    const errBox = document.getElementById("gb-inline-login-err");
    const btn = document.getElementById("gb-inline-login-btn");

    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    const settings = await getSettings();

    btn.innerText = "Verificando estudiante...";
    btn.disabled = true;
    errBox.style.display = "none";

    try {
      const resp = await fetch(`${settings.apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!resp.ok) {
        throw new Error("Credenciales inválidas. Verifica tu correo o contraseña.");
      }

      const tokenData = await resp.json();
      const token = tokenData.access_token;

      // Get profile
      let userName = "Estudiante";
      let studentLevel = "B1";
      try {
        const meResp = await fetch(`${settings.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meResp.ok) {
          const meData = await meResp.json();
          userName = meData.name || "Estudiante";
        }
      } catch (e) {}

      // Save to chrome.storage
      await new Promise((res) => {
        chrome.storage.local.set(
          {
            authToken: token,
            userEmail: email,
            userName: userName,
            studentLevel: studentLevel,
          },
          res
        );
      });

      const studentTag = document.getElementById("gb-header-student-tag");
      studentTag.innerText = userName;
      studentTag.style.display = "inline-block";

      // Show mode selection after successful login
      showModeSelection();
    } catch (err) {
      errBox.innerText = err.message || "Error al autenticar.";
      errBox.style.display = "block";
    } finally {
      btn.innerText = "Iniciar Sesión y Desbloquear";
      btn.disabled = false;
    }
  }

  // 9. Trigger Companion (Pause video and open modal)
  async function triggerCompanion() {
    const video = getNetflixVideo();
    if (video && !video.paused) {
      video.pause();
    }

    const subText = readCurrentSubtitle() || currentSubtitle || "Esperando diálogo en escena...";
    const modal = ensureModal();
    const settings = await getSettings();

    // Check student authentication
    const studentTag = document.getElementById("gb-header-student-tag");

    if (!settings.authToken) {
      hideAllViews();
      document.getElementById("gb-view-auth-locked").style.display = "block";
      document.getElementById("gb-tabs-nav").style.display = "none";
      document.getElementById("gb-switch-mode-btn").style.display = "none";
      studentTag.style.display = "none";
    } else {
      studentTag.innerText = settings.userName || "Estudiante";
      studentTag.style.display = "inline-block";

      if (!currentMode) {
        // First time opening: show mode selection
        showModeSelection();
      } else {
        document.getElementById("gb-tabs-nav").style.display = "flex";
        document.getElementById("gb-switch-mode-btn").style.display = "inline-block";

        if (currentMode === "masterclass" && cachedMasterclass) {
          switchActiveTab("masterclass");
        } else {
          switchActiveTab("scene");
          if (subText && subText !== "Esperando diálogo en escena...") {
            querySceneAnalysis("Explica el modismo o frase clave en esta escena.");
          }
        }
      }
    }

    document.getElementById("gb-modal-sub-text").innerText = `"${subText}"`;
    modal.style.display = "flex";
    isModalOpen = true;
  }

  // 10. Close modal
  function closeModal() {
    const modal = document.getElementById("gb-companion-modal");
    if (modal) modal.style.display = "none";
    isModalOpen = false;
    if (activeAudio) {
      activeAudio.pause();
    }
  }

  // 11. Call Guionbajo Backend for Scene Explanation
  async function querySceneAnalysis(studentQuestion) {
    const container = document.getElementById("gb-response-container");
    container.innerHTML = `
      <div class="gb-loading-state">
        <div class="gb-spinner"></div>
        <span>Guionbajo AI analizando escena y tiempos verbales...</span>
      </div>
    `;

    const subText = readCurrentSubtitle() || currentSubtitle;
    const settings = await getSettings();

    if (!settings.authToken) {
      hideAllViews();
      document.getElementById("gb-view-auth-locked").style.display = "block";
      return;
    }

    try {
      const resp = await fetch(`${settings.apiUrl}/netflix/ask-scene`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.authToken}`,
        },
        body: JSON.stringify({
          current_subtitle: subText,
          context_before: subtitleHistory.slice(0, -1),
          student_question: studentQuestion,
          student_level: settings.studentLevel,
          voice_id: settings.voiceId,
          show_title: document.title.replace(" - Netflix", "").trim() || "Netflix Series",
        }),
      });

      if (resp.status === 401) {
        chrome.storage.local.remove(["authToken"]);
        hideAllViews();
        document.getElementById("gb-view-auth-locked").style.display = "block";
        throw new Error("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
      }

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      renderSceneResult(data, settings);
    } catch (err) {
      console.error("[Guionbajo AI] Error en consulta:", err);
      container.innerHTML = `
        <div style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); padding:14px; border-radius:12px; font-size:13px; color:#fca5a5;">
          ⚠️ ${escapeHtml(err.message || "Error al procesar la escena.")}
        </div>
      `;
    }
  }

  // 12. Render Scene Result with Audio
  function renderSceneResult(data, settings) {
    const container = document.getElementById("gb-response-container");
    const termBadge = (data.term_type || "VOCABULARIO").replace("_", " ");

    container.innerHTML = `
      <div class="gb-result-card">
        <div class="gb-result-top">
          <span class="gb-term-badge">${escapeHtml(termBadge)}</span>
          <span style="font-size:11px; color:#94a3b8;">Nivel ${data.student_level || "B1"}</span>
        </div>

        <h3 class="gb-key-term">${escapeHtml(data.key_term || data.current_subtitle)}</h3>
        <div class="gb-meaning">${escapeHtml(data.meaning_es || "")}</div>
        
        ${data.scene_context ? `<div class="gb-scene-context">${escapeHtml(data.scene_context)}</div>` : ""}

        ${
          data.practical_example_en
            ? `
          <div class="gb-example-box">
            <div class="gb-example-en">"${escapeHtml(data.practical_example_en)}"</div>
            <div class="gb-example-es">${escapeHtml(data.practical_example_es || "")}</div>
          </div>
        `
            : ""
        }

        ${
          data.audio_base64
            ? `
          <div class="gb-slide-audio-box" id="gb-scene-audio-box" style="margin-top:12px;">
            ${buildGuionbajoAvatarHtml("gb-scene-tutor-avatar", "normal")}
            <button class="gb-slide-audio-btn" id="gb-play-audio-btn" title="Escuchar explicación">
              <span id="gb-scene-audio-icon">▶</span>
            </button>
            <div class="gb-slide-audio-content">
              <div class="gb-slide-audio-title">
                <span id="gb-scene-audio-title-text">🎧 Guionbajo Explica la Escena</span>
              </div>
              <div class="gb-slide-audio-sub" id="gb-scene-audio-sub-text">Haz clic sobre Guionbajo o en Play para escuchar su análisis</div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    if (data.audio_base64) {
      if (activeAudio) activeAudio.pause();
      activeAudio = new Audio("data:audio/mp3;base64," + data.audio_base64);

      const playBtn = document.getElementById("gb-play-audio-btn");
      const playIcon = document.getElementById("gb-scene-audio-icon");
      const titleText = document.getElementById("gb-scene-audio-title-text");
      const subText = document.getElementById("gb-scene-audio-sub-text");
      const sceneAvatar = document.getElementById("gb-scene-tutor-avatar");

      function updateSceneAudioUI(isPlaying) {
        setAvatarSpeakingState("gb-scene-tutor-avatar", isPlaying);
        if (isPlaying) {
          if (playBtn) playBtn.classList.add("gb-playing");
          if (playIcon) playIcon.innerText = "⏸";
          if (titleText) titleText.innerHTML = `🗣️ <span style="color:#00E676; font-weight:800;">Guionbajo explicando...</span>`;
          if (subText) subText.innerText = "Escuchando análisis del tutor (haz clic para pausar)";
        } else {
          if (playBtn) playBtn.classList.remove("gb-playing");
          if (playIcon) playIcon.innerText = "▶";
          if (titleText) titleText.innerText = "🎧 Guionbajo Explica la Escena";
          if (subText) subText.innerText = "Haz clic sobre Guionbajo o en Play para escuchar su análisis";
        }
      }

      if (playBtn) {
        playBtn.addEventListener("click", () => {
          if (activeAudio.paused) {
            activeAudio.play();
          } else {
            activeAudio.pause();
          }
        });
      }

      if (sceneAvatar && playBtn) {
        sceneAvatar.addEventListener("click", () => playBtn.click());
      }

      activeAudio.addEventListener("play", () => updateSceneAudioUI(true));
      activeAudio.addEventListener("pause", () => updateSceneAudioUI(false));
      activeAudio.addEventListener("ended", () => updateSceneAudioUI(false));

      if (settings.autoPlayVoice) {
        activeAudio.play().catch((e) => console.log("Autoplay policy notice:", e));
      }
    }
  }

  // 13. Full Masterclass Generator Call
  async function generateFullMasterclass() {
    const resultsContainer = document.getElementById("gb-mc-results-container");
    resultsContainer.innerHTML = `
      <div class="gb-loading-state" style="margin-top:14px;">
        <div class="gb-spinner"></div>
        <span>Generando Clase Previa con 10-15 expresiones y análisis de tiempos verbales...</span>
      </div>
    `;

    const settings = await getSettings();
    const showTitle = document.title.replace(" - Netflix", "").trim() || "Netflix Series";
    const sampleSubtitles = subtitleHistory.join("\n") || currentSubtitle || "Diálogos del capítulo";

    try {
      const resp = await fetch(`${settings.apiUrl}/netflix/generate-full-class`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.authToken}`,
        },
        body: JSON.stringify({
          show_title: showTitle,
          episode_title: "Episodio Actual",
          subtitles_sample: sampleSubtitles,
          student_level: settings.studentLevel,
          voice_id: settings.voiceId,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Error en el servidor: HTTP ${resp.status}`);
      }

      const resData = await resp.json();
      cachedMasterclass = resData.masterclass;

      // REQUISITO: La clase no debe empezar hasta que la foto del primer slide esté lista
      const firstVocab = cachedMasterclass?.vocabulary_list?.[0];
      if (firstVocab && !IMAGE_CACHE[firstVocab.term]) {
        resultsContainer.innerHTML = `
          <div class="gb-loading-state" style="margin-top:14px;">
            <div class="gb-spinner"></div>
            <span>Generando ilustración conceptual inicial para "${escapeHtml(firstVocab.term)}" con MiniMax...</span>
          </div>
        `;
        const firstImgUrl = await fetchMiniMaxImage(firstVocab.term, firstVocab.image_prompt, settings);
        if (firstImgUrl) {
          firstVocab.image_url = firstImgUrl;
        }
      }

      renderMasterclass(cachedMasterclass);
    } catch (err) {
      resultsContainer.innerHTML = `
        <div style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); padding:14px; border-radius:12px; font-size:13px; color:#fca5a5; margin-top:14px;">
          ⚠️ ${escapeHtml(err.message || "Error generando clase previa.")}
        </div>
      `;
    }
  }

  // In-memory cache for generated MiniMax images (term -> url)
  const IMAGE_CACHE = {};

  async function fetchMiniMaxImage(term, prompt, settings) {
    if (IMAGE_CACHE[term]) return IMAGE_CACHE[term];

    let effectivePrompt = (prompt || "").trim();
    if (
      !effectivePrompt ||
      effectivePrompt.includes("visual representation of the concept") ||
      effectivePrompt.length < 25
    ) {
      const abstractTerms = ["to no avail", "furthermore", "nevertheless", "by and large", "all in all", "meanwhile", "moreover", "as a matter of fact"];
      const isAbstract = abstractTerms.some((ab) => (term || "").toLowerCase().includes(ab));
      if (isAbstract) {
        effectivePrompt =
          "A focused and cheerful student happily studying English with headphones, notebook and laptop at a modern study desk, clean flat 2D vector educational illustration, zero text, completely textless scene, vibrant colors, strictly no text, no words, no letters";
      } else {
        effectivePrompt =
          `Clean flat 2D vector educational illustration, zero text, completely textless scene, visual action vividly illustrating ${term}, vibrant colors, minimalist art style, strictly no text, no words, no letters`;
      }
    }

    try {
      const resp = await fetch(`${settings.apiUrl}/image/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.authToken}`,
        },
        body: JSON.stringify({
          prompt: effectivePrompt,
          aspect_ratio: "16:9",
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const imgUrl = data.url || data.image_url;
        if (imgUrl) {
          IMAGE_CACHE[term] = imgUrl;
          return imgUrl;
        }
      }
    } catch (e) {
      console.warn("[Guionbajo AI] MiniMax image generation notice:", e);
    }
    return null;
  }

  // In-memory cache for slide voice speech (key -> base64)
  const AUDIO_CACHE = {};

  async function fetchSlideAudio(text, cacheKey, settings) {
    if (!text || !text.trim()) return null;
    if (AUDIO_CACHE[cacheKey]) return AUDIO_CACHE[cacheKey];

    try {
      const resp = await fetch(`${settings.apiUrl}/netflix/synthesize-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.authToken}`,
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: settings.voiceId || "es-US-AlonsoNeural",
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.audio_base64) {
          AUDIO_CACHE[cacheKey] = data.audio_base64;
          return data.audio_base64;
        }
      }
    } catch (e) {
      console.warn("[Guionbajo AI] Slide speech fetch notice:", e);
    }
    return null;
  }

  // In-memory cache for word pronunciation audio
  const PRONUNCIATION_CACHE = {};
  let activePronunciationAudio = null;

  async function playWordPronunciation(word, settings) {
    if (!word || !word.trim()) return;
    const cleanWord = word.trim().replace(/^["']|["']$/g, "");

    // Visual pulse effect on the term
    const termEl = document.getElementById("gb-btn-pronounce-term");
    if (termEl) {
      termEl.classList.add("gb-term-speaking");
      setTimeout(() => termEl.classList.remove("gb-term-speaking"), 1200);
    }

    // 1. Instant 0ms native browser speech synthesis (en-US)
    let nativePlayed = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanWord);
        utterance.lang = "en-US";
        utterance.rate = 0.85;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const enVoice =
          voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Jenny") || v.name.includes("Roger") || v.name.includes("Google"))) ||
          voices.find((v) => v.lang.startsWith("en"));
        if (enVoice) utterance.voice = enVoice;

        window.speechSynthesis.speak(utterance);
        nativePlayed = true;
      } catch (e) {
        console.warn("[Guionbajo AI] Browser native speech error:", e);
      }
    }

    // 2. High-definition backend audio cache hit
    if (PRONUNCIATION_CACHE[cleanWord]) {
      try {
        if (activePronunciationAudio) activePronunciationAudio.pause();
        activePronunciationAudio = new Audio(PRONUNCIATION_CACHE[cleanWord]);
        activePronunciationAudio.play();
        return;
      } catch (e) {}
    }

    // Pre-cache high definition audio from /tts/synthesize for subsequent clicks
    fetch(`${settings.apiUrl}/tts/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanWord,
        voice: "en-US-RogerNeural",
        speed: 0.9,
      }),
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (blob && blob.size > 200) {
          const url = URL.createObjectURL(blob);
          PRONUNCIATION_CACHE[cleanWord] = url;
          if (!nativePlayed) {
            if (activePronunciationAudio) activePronunciationAudio.pause();
            activePronunciationAudio = new Audio(url);
            activePronunciationAudio.play();
          }
        }
      })
      .catch(() => {});
  }

  // 14. Render Masterclass as an Interactive Slide-by-Slide Wizard
  function renderMasterclass(mc) {
    const resultsContainer = document.getElementById("gb-mc-results-container");
    const modal = document.getElementById("gb-companion-modal");
    if (!resultsContainer || !mc) return;

    // Expand modal width smoothly
    if (modal) modal.classList.add("gb-modal-expanded");

    const vocabItems = mc.vocabulary_list || [];
    const grammarItems = mc.grammar_verb_tenses || [];

    let currentVocabSlide = 0;
    let currentGrammarSlide = 0;

    // REQUISITO: Las demás imágenes de las demás slides deben irse creando en segundo plano
    let isPrefetchingImages = false;
    async function prefetchImagesQueue() {
      if (isPrefetchingImages) return;
      isPrefetchingImages = true;
      const s = await getSettings();
      for (let i = 1; i < vocabItems.length; i++) {
        const v = vocabItems[i];
        if (!v || IMAGE_CACHE[v.term]) continue;
        try {
          await fetchMiniMaxImage(v.term, v.image_prompt, s);
        } catch (e) {
          console.warn(`[Guionbajo AI] Background image prefetch for ${v.term}:`, e);
        }
        await new Promise((r) => setTimeout(r, 600));
      }
      isPrefetchingImages = false;
    }

    prefetchImagesQueue();

    // A. Render Vocabulary Slide
    async function showVocabSlide(idx) {
      if (idx < 0) idx = 0;
      if (idx >= vocabItems.length) {
        // All vocab completed -> move to grammar
        showGrammarSlide(0);
        return;
      }

      // Stop any audio currently playing
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }

      currentVocabSlide = idx;
      const item = vocabItems[idx];
      const settings = await getSettings();

      const progressPct = Math.round(((idx + 1) / vocabItems.length) * 100);

      // Extract 2 simulated events (or fallback)
      let events = item.simulated_events || [];
      if (!events || events.length === 0) {
        events = [
          {
            event_name: "Evento 1: En la serie / Trama",
            sentence_en: item.example_en || item.term,
            sentence_es: item.example_es || item.meaning_es,
          },
          {
            event_name: "Evento 2: En la vida cotidiana / Conversación",
            sentence_en: `When people talk, they often say: "${item.term}".`,
            sentence_es: `En una conversación real, esta frase expresa: "${item.meaning_es}".`,
          },
        ];
      }

      const eventsHtml = events
        .slice(0, 2)
        .map(
          (ev, eIdx) => `
        <div class="gb-event-box">
          <div class="gb-event-tag">
            <span>${eIdx === 0 ? "🎬" : "💼"}</span>
            <span>${escapeHtml(ev.event_name || (eIdx === 0 ? "Evento 1: En la serie" : "Evento 2: Vida cotidiana"))}</span>
          </div>
          <div class="gb-event-sentence-en">"${escapeHtml(ev.sentence_en)}"</div>
          <div class="gb-event-sentence-es">${escapeHtml(ev.sentence_es)}</div>
        </div>
      `
        )
        .join("");

      const speechText =
        item.tutor_speech_text ||
        `La expresión "${item.term}" significa ${item.meaning_es}. Analicémosla con atención en esta escena.`;

      resultsContainer.innerHTML = `
        <div class="gb-slide-tracker">
          <div class="gb-slide-steps-row">
            <span class="gb-slide-step-badge">Fase 1: Vocabulario Esencial</span>
            <span>Expresión ${idx + 1} de ${vocabItems.length}</span>
          </div>
          <div class="gb-slide-progress-bar">
            <div class="gb-slide-progress-fill" style="width: ${progressPct}%;"></div>
          </div>
        </div>

        <div class="gb-vocab-slide-card">
          <div class="gb-slide-header">
            <div>
              <div class="gb-slide-term-wrapper" id="gb-btn-pronounce-term" title="Haz clic sobre la expresión para escuchar su pronunciación en inglés">
                <h2 class="gb-slide-term">${escapeHtml(item.term)}</h2>
                <span class="gb-pronounce-badge">🔊</span>
              </div>
              <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
                ${item.scene_context ? `🎬 ${escapeHtml(item.scene_context)}` : ""}
              </div>
            </div>
            <span class="gb-slide-type-tag">${escapeHtml((item.type || "vocab").replace("_", " "))}</span>
          </div>

          <div class="gb-slide-meaning">
            <b>Significado:</b> ${escapeHtml(item.meaning_es)}
          </div>

          <!-- Tutor Voice Explanation Player (Sin mostrar el texto hablado en pantalla) -->
          <div class="gb-slide-audio-box" id="gb-slide-audio-box">
            ${buildGuionbajoAvatarHtml("gb-slide-vocab-avatar", "normal")}
            <button class="gb-slide-audio-btn" id="gb-slide-audio-btn" title="Reproducir / Pausar explicación del tutor">
              <span id="gb-slide-audio-icon">▶</span>
            </button>
            <div class="gb-slide-audio-content">
              <div class="gb-slide-audio-title">
                <span id="gb-slide-vocab-title">🎧 Guionbajo Explica esta Expresión</span>
                <div class="gb-audio-waves" id="gb-slide-audio-waves" style="display:none;">
                  <div class="gb-wave-bar"></div>
                  <div class="gb-wave-bar"></div>
                  <div class="gb-wave-bar"></div>
                  <div class="gb-wave-bar"></div>
                </div>
              </div>
              <div class="gb-slide-audio-sub" id="gb-slide-vocab-sub">Haz clic sobre Guionbajo o en Play para escuchar la explicación de voz</div>
            </div>
          </div>

          <!-- MiniMax Concept Illustration Box -->
          <div class="gb-slide-image-box" id="gb-slide-img-box" data-term="${escapeHtml(item.term)}">
            <div class="gb-slide-image-skeleton">
              <div class="gb-spinner"></div>
              <span>🎨 MiniMax creando ilustración conceptual (sin texto)...</span>
            </div>
          </div>

          <!-- 2 Simulated Events -->
          <div style="font-size:12px; font-weight:700; color:#38bdf8; margin-top:4px;">
            🎭 2 Situaciones donde se usa esta expresión:
          </div>
          <div class="gb-events-container">
            ${eventsHtml}
          </div>

          <!-- Slide Navigation -->
          <div class="gb-slide-nav-bar">
            <button class="gb-btn-slide-nav gb-btn-slide-prev" id="gb-btn-prev-slide" ${idx === 0 ? "disabled" : ""}>
              ⬅ Anterior
            </button>
            <span style="font-size:12px; color:#94a3b8; font-weight:700;">
              ${idx + 1} / ${vocabItems.length}
            </span>
            <button class="gb-btn-slide-nav gb-btn-slide-next" id="gb-btn-next-slide">
              <span>Entendido, Siguiente</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      `;

      // Pronunciation click handler
      const termBtn = document.getElementById("gb-btn-pronounce-term");
      if (termBtn) {
        termBtn.addEventListener("click", () => {
          playWordPronunciation(item.term, settings);
        });
      }

      // Audio setup for vocabulary slide
      const audioBtn = document.getElementById("gb-slide-audio-btn");
      const audioIcon = document.getElementById("gb-slide-audio-icon");
      const waves = document.getElementById("gb-slide-audio-waves");
      const vocabAvatar = document.getElementById("gb-slide-vocab-avatar");
      const currentTerm = item.term;

      function updateVocabAudioUI(isPlaying) {
        setAvatarSpeakingState("gb-slide-vocab-avatar", isPlaying);
        const titleEl = document.getElementById("gb-slide-vocab-title");
        const subEl = document.getElementById("gb-slide-vocab-sub");
        if (isPlaying) {
          if (audioBtn) audioBtn.classList.add("gb-playing");
          if (audioIcon) audioIcon.innerText = "⏸";
          if (waves) waves.style.display = "flex";
          if (titleEl) titleEl.innerHTML = `🗣️ <span style="color:#00E676; font-weight:800;">Guionbajo explicando...</span>`;
          if (subEl) subEl.innerText = "Explicación por voz activa (haz clic para pausar)";
        } else {
          if (audioBtn) audioBtn.classList.remove("gb-playing");
          if (audioIcon) audioIcon.innerText = "▶";
          if (waves) waves.style.display = "none";
          if (titleEl) titleEl.innerText = "🎧 Guionbajo Explica esta Expresión";
          if (subEl) subEl.innerText = "Haz clic sobre Guionbajo o en Play para escuchar la explicación de voz";
        }
      }

      function playVocabAudio(b64) {
        if (activeAudio) activeAudio.pause();
        activeAudio = new Audio("data:audio/mp3;base64," + b64);
        activeAudio.addEventListener("play", () => updateVocabAudioUI(true));
        activeAudio.addEventListener("pause", () => updateVocabAudioUI(false));
        activeAudio.addEventListener("ended", () => updateVocabAudioUI(false));
        activeAudio.play().catch((err) => console.log("Slide audio autoplay notice:", err));
      }

      if (vocabAvatar && audioBtn) {
        vocabAvatar.addEventListener("click", () => audioBtn.click());
      }

      if (item.audio_base64) {
        AUDIO_CACHE[currentTerm] = item.audio_base64;
      }

      if (AUDIO_CACHE[currentTerm]) {
        if (settings.autoPlayVoice) {
          playVocabAudio(AUDIO_CACHE[currentTerm]);
        }
      } else {
        if (audioIcon) audioIcon.innerText = "⏳";
        fetchSlideAudio(speechText, currentTerm, settings).then((b64) => {
          if (currentVocabSlide === idx) {
            if (audioIcon) audioIcon.innerText = "▶";
            if (b64 && settings.autoPlayVoice) {
              playVocabAudio(b64);
            }
          }
        });
      }

      if (audioBtn) {
        audioBtn.addEventListener("click", () => {
          if (activeAudio && !activeAudio.paused) {
            activeAudio.pause();
            return;
          }
          if (AUDIO_CACHE[currentTerm]) {
            playVocabAudio(AUDIO_CACHE[currentTerm]);
          } else {
            if (audioIcon) audioIcon.innerText = "⏳";
            fetchSlideAudio(speechText, currentTerm, settings).then((b64) => {
              if (audioIcon) audioIcon.innerText = "▶";
              if (b64) playVocabAudio(b64);
            });
          }
        });
      }

      // Prefetch audio for next vocabulary slide in background
      if (idx + 1 < vocabItems.length) {
        const nextItem = vocabItems[idx + 1];
        const nextSpeech =
          nextItem.tutor_speech_text ||
          `La expresión ${nextItem.term} significa ${nextItem.meaning_es}.`;
        fetchSlideAudio(nextSpeech, nextItem.term, settings);
      }

      // Trigger MiniMax Image Fetch
      const imgBox = document.getElementById("gb-slide-img-box");

      if (IMAGE_CACHE[currentTerm]) {
        imgBox.innerHTML = `<img src="${IMAGE_CACHE[currentTerm]}" class="gb-slide-image" alt="${escapeHtml(currentTerm)}">`;
      } else {
        fetchMiniMaxImage(currentTerm, item.image_prompt, settings).then((imgUrl) => {
          if (imgUrl) {
            const activeBox = document.getElementById("gb-slide-img-box");
            if (activeBox && activeBox.getAttribute("data-term") === currentTerm) {
              activeBox.innerHTML = `<img src="${imgUrl}" class="gb-slide-image" alt="${escapeHtml(currentTerm)}">`;
            }
          } else {
            const activeBox = document.getElementById("gb-slide-img-box");
            if (activeBox && activeBox.getAttribute("data-term") === currentTerm) {
              activeBox.innerHTML = `
                <div style="font-size:12px; color:#64748b; text-align:center; padding:16px;">
                  🎨 <i>Ilustración conceptual para "${escapeHtml(currentTerm)}"</i>
                </div>
              `;
            }
          }
        });
      }

      // Bind nav buttons
      document.getElementById("gb-btn-prev-slide").addEventListener("click", () => {
        if (idx > 0) showVocabSlide(idx - 1);
      });

      document.getElementById("gb-btn-next-slide").addEventListener("click", () => {
        showVocabSlide(idx + 1);
      });
    }

    // B. Render Grammar / Verb Tense Slide
    async function showGrammarSlide(idx) {
      if (idx < 0) {
        showVocabSlide(vocabItems.length - 1);
        return;
      }
      if (idx >= grammarItems.length) {
        showCompletionScreen();
        return;
      }

      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }

      currentGrammarSlide = idx;
      const g = grammarItems[idx];
      const settings = await getSettings();
      const progressPct = Math.round(((idx + 1) / (grammarItems.length || 1)) * 100);

      const gSpeech =
        g.tutor_speech_text ||
        `En esta oración vemos el tiempo verbal ${g.verb_tense}. ${g.why_this_tense}`;
      const grammarKey = `grammar_${idx}_${g.verb_tense}`;

      resultsContainer.innerHTML = `
        <div class="gb-slide-tracker">
          <div class="gb-slide-steps-row">
            <span class="gb-slide-step-badge" style="color:#a78bfa; background:rgba(167,139,250,0.12);">
              Fase 2: Gramática y Tiempos Verbales
            </span>
            <span>Estructura ${idx + 1} de ${grammarItems.length}</span>
          </div>
          <div class="gb-slide-progress-bar">
            <div class="gb-slide-progress-fill" style="width: ${progressPct}%; background:linear-gradient(90deg,#818cf8 0%,#a78bfa 100%);"></div>
          </div>
        </div>

        <div class="gb-grammar-card" style="animation: gb-fade-slide 0.25s ease forwards;">
          <div class="gb-tense-badge">Tiempo Verbal: ${escapeHtml(g.verb_tense)}</div>
          <div class="gb-dialogue-quote">"${escapeHtml(g.dialogue_sentence)}"</div>

          <!-- Tutor Voice Explanation Player (Sin texto transcript en pantalla) -->
          <div class="gb-slide-audio-box" id="gb-grammar-audio-box" style="margin-bottom:12px;">
            ${buildGuionbajoAvatarHtml("gb-slide-grammar-avatar", "normal")}
            <button class="gb-slide-audio-btn" id="gb-grammar-audio-btn" title="Reproducir / Pausar explicación del tutor">
              <span id="gb-grammar-audio-icon">▶</span>
            </button>
            <div class="gb-slide-audio-content">
              <div class="gb-slide-audio-title">
                <span id="gb-grammar-audio-title-text">🎧 Guionbajo Analiza el Tiempo Verbal</span>
                <div class="gb-audio-waves" id="gb-grammar-audio-waves" style="display:none;">
                  <div class="gb-wave-bar"></div>
                  <div class="gb-wave-bar"></div>
                  <div class="gb-wave-bar"></div>
                  <div class="gb-wave-bar"></div>
                </div>
              </div>
              <div class="gb-slide-audio-sub" id="gb-grammar-audio-sub-text">
                Haz clic sobre Guionbajo o en Play para escuchar el análisis del tiempo verbal
              </div>
            </div>
          </div>

          <div class="gb-formula-box">📐 Fórmula: ${escapeHtml(g.formula)}</div>
          <div class="gb-tense-reason">
            <b>¿Por qué usó este tiempo verbal aquí?:</b><br>
            ${escapeHtml(g.why_this_tense)}
          </div>
          ${g.contrast_explanation ? `<div class="gb-contrast-text">💡 <b>Contraste:</b> ${escapeHtml(g.contrast_explanation)}</div>` : ""}

          ${
            g.quiz
              ? `
            <div class="gb-quiz-box" data-quiz-id="${idx}">
              <div class="gb-quiz-question">❓ Quiz: ${escapeHtml(g.quiz.question)}</div>
              ${(g.quiz.options || [])
                .map(
                  (opt, optIdx) => `
                <button class="gb-quiz-option-btn" data-correct="${optIdx === g.quiz.correct_index}">
                  ${String.fromCharCode(65 + optIdx)}) ${escapeHtml(opt)}
                </button>
              `
                )
                .join("")}
              <div class="gb-quiz-feedback" id="gb-quiz-feed-${idx}"></div>
            </div>
          `
              : ""
          }

          <!-- Grammar Nav Bar -->
          <div class="gb-slide-nav-bar">
            <button class="gb-btn-slide-nav gb-btn-slide-prev" id="gb-btn-prev-grammar">
              ⬅ Anterior
            </button>
            <span style="font-size:12px; color:#94a3b8; font-weight:700;">
              ${idx + 1} / ${grammarItems.length}
            </span>
            <button class="gb-btn-slide-nav gb-btn-slide-next" id="gb-btn-next-grammar">
              <span>${idx === grammarItems.length - 1 ? "Completar Clase" : "Siguiente Estructura"}</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      `;

      // Audio setup for grammar slide
      const gAudioBtn = document.getElementById("gb-grammar-audio-btn");
      const gAudioIcon = document.getElementById("gb-grammar-audio-icon");
      const gWaves = document.getElementById("gb-grammar-audio-waves");
      const gAvatar = document.getElementById("gb-slide-grammar-avatar");

      function updateGrammarAudioUI(isPlaying) {
        setAvatarSpeakingState("gb-slide-grammar-avatar", isPlaying);
        const titleEl = document.getElementById("gb-grammar-audio-title-text");
        const subEl = document.getElementById("gb-grammar-audio-sub-text");
        if (isPlaying) {
          if (gAudioBtn) gAudioBtn.classList.add("gb-playing");
          if (gAudioIcon) gAudioIcon.innerText = "⏸";
          if (gWaves) gWaves.style.display = "flex";
          if (titleEl) titleEl.innerHTML = `🗣️ <span style="color:#00E676; font-weight:800;">Guionbajo explicando...</span>`;
          if (subEl) subEl.innerText = "Escuchando análisis gramatical (haz clic para pausar)";
        } else {
          if (gAudioBtn) gAudioBtn.classList.remove("gb-playing");
          if (gAudioIcon) gAudioIcon.innerText = "▶";
          if (gWaves) gWaves.style.display = "none";
          if (titleEl) titleEl.innerText = "🎧 Guionbajo Analiza el Tiempo Verbal";
          if (subEl) subEl.innerText = "Haz clic sobre Guionbajo o en Play para escuchar el análisis del tiempo verbal";
        }
      }

      function playGrammarAudio(b64) {
        if (activeAudio) activeAudio.pause();
        activeAudio = new Audio("data:audio/mp3;base64," + b64);
        activeAudio.addEventListener("play", () => updateGrammarAudioUI(true));
        activeAudio.addEventListener("pause", () => updateGrammarAudioUI(false));
        activeAudio.addEventListener("ended", () => updateGrammarAudioUI(false));
        activeAudio.play().catch((err) => console.log("Grammar audio autoplay notice:", err));
      }

      if (gAvatar && gAudioBtn) {
        gAvatar.addEventListener("click", () => gAudioBtn.click());
      }

      if (AUDIO_CACHE[grammarKey]) {
        if (settings.autoPlayVoice) {
          playGrammarAudio(AUDIO_CACHE[grammarKey]);
        }
      } else {
        if (gAudioIcon) gAudioIcon.innerText = "⏳";
        fetchSlideAudio(gSpeech, grammarKey, settings).then((b64) => {
          if (currentGrammarSlide === idx) {
            if (gAudioIcon) gAudioIcon.innerText = "▶";
            if (b64 && settings.autoPlayVoice) {
              playGrammarAudio(b64);
            }
          }
        });
      }

      if (gAudioBtn) {
        gAudioBtn.addEventListener("click", () => {
          if (activeAudio && !activeAudio.paused) {
            activeAudio.pause();
            return;
          }
          if (AUDIO_CACHE[grammarKey]) {
            playGrammarAudio(AUDIO_CACHE[grammarKey]);
          } else {
            if (gAudioIcon) gAudioIcon.innerText = "⏳";
            fetchSlideAudio(gSpeech, grammarKey, settings).then((b64) => {
              if (gAudioIcon) gAudioIcon.innerText = "▶";
              if (b64) playGrammarAudio(b64);
            });
          }
        });
      }

      // Prefetch next grammar slide audio
      if (idx + 1 < grammarItems.length) {
        const nextG = grammarItems[idx + 1];
        const nextGSpeech =
          nextG.tutor_speech_text ||
          `En esta escena vemos el tiempo verbal ${nextG.verb_tense}. ${nextG.why_this_tense}`;
        fetchSlideAudio(nextGSpeech, `grammar_${idx + 1}_${nextG.verb_tense}`, settings);
      }

      // Quiz feedback handler
      const quizBox = resultsContainer.querySelector(".gb-quiz-box");
      if (quizBox) {
        const feed = quizBox.querySelector(".gb-quiz-feedback");
        quizBox.querySelectorAll(".gb-quiz-option-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const isCorrect = btn.getAttribute("data-correct") === "true";
            feed.style.display = "block";
            if (isCorrect) {
              feed.style.background = "rgba(16,185,129,0.2)";
              feed.style.color = "#34d399";
              feed.innerText = "¡Correcto! Excelente comprensión del tiempo verbal.";
              btn.style.borderColor = "#10b981";
            } else {
              feed.style.background = "rgba(239,68,68,0.2)";
              feed.style.color = "#f87171";
              feed.innerText = "Intenta de nuevo. Revisa la fórmula y la explicación arriba.";
              btn.style.borderColor = "#ef4444";
            }
          });
        });
      }

      // Nav handlers
      document.getElementById("gb-btn-prev-grammar").addEventListener("click", () => {
        showGrammarSlide(idx - 1);
      });
      document.getElementById("gb-btn-next-grammar").addEventListener("click", () => {
        showGrammarSlide(idx + 1);
      });
    }

    // C. Render Completion Screen (Auto-Rewind)
    function showCompletionScreen() {
      resultsContainer.innerHTML = `
        <div class="gb-slide-tracker">
          <div class="gb-slide-steps-row">
            <span class="gb-slide-step-badge" style="color:#10b981; background:rgba(16,185,129,0.15);">
              ¡Clase Completada al 100%!
            </span>
            <span>${vocabItems.length} expresiones dominadas</span>
          </div>
          <div class="gb-slide-progress-bar">
            <div class="gb-slide-progress-fill" style="width: 100%; background:#10b981;"></div>
          </div>
        </div>

        <div class="gb-launch-banner" style="animation: gb-fade-slide 0.3s ease forwards;">
          <div style="font-size:36px;">🎉</div>
          <div class="gb-launch-title">¡Has completado tu calentamiento previo!</div>
          <div class="gb-launch-sub">
            Ya dominas las <b>${vocabItems.length} expresiones</b> y los tiempos verbales clave de este capítulo. Al presionar el botón, <b>el video se rebobinará automáticamente al segundo 0 (00:00) y comenzará la reproducción</b>.
          </div>
          <button class="gb-launch-video-btn" id="gb-btn-start-from-beginning">
            <span>🎬</span> Iniciar Película desde el Principio (00:00)
          </button>
        </div>
      `;

      const startBtn = document.getElementById("gb-btn-start-from-beginning");
      if (startBtn) {
        startBtn.addEventListener("click", () => {
          const video = getNetflixVideo();
          if (video) {
            video.currentTime = 0; // Rebobina a 00:00
            video.play();          // Inicia video
          }
          closeModal();
        });
      }
    }

    // Start with Slide 0 of Vocabulary!
    showVocabSlide(0);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // 15. Global Keyboard Shortcuts Listener
  document.addEventListener("keydown", (e) => {
    const activeEl = document.activeElement;
    const isTyping =
      activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable);

    if (isTyping) {
      if (e.key === "Escape") activeEl.blur();
      return;
    }

    // Key 'Q' pauses and triggers companion
    if (e.key.toLowerCase() === "q") {
      e.preventDefault();
      triggerCompanion();
    }

    // Key 'Escape' closes companion
    if (e.key === "Escape" && isModalOpen) {
      closeModal();
    }
  });

  // Periodically check if Netflix player is mounted to inject the launcher
  setInterval(() => {
    if (getNetflixVideo() && !document.getElementById("gb-netflix-launcher")) {
      injectLauncher();
    }
  }, 1500);
})();
