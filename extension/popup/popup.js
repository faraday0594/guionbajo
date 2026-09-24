document.addEventListener("DOMContentLoaded", async () => {
  const loginView = document.getElementById("login-view");
  const authView = document.getElementById("auth-view");
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginApiUrl = document.getElementById("login-api-url");
  const apiUrlInput = document.getElementById("api-url");
  const voiceIdSelect = document.getElementById("voice-id");
  const autoPlayCheckbox = document.getElementById("auto-play-voice");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const toast = document.getElementById("toast");
  const errBox = document.getElementById("err-box");

  const profName = document.getElementById("prof-name");
  const profLevel = document.getElementById("prof-level");
  const profEmail = document.getElementById("prof-email");

  const statusBadge = document.getElementById("status-badge");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  // Load state from chrome.storage
  chrome.storage.local.get(
    ["apiUrl", "authToken", "userName", "userEmail", "studentLevel", "voiceId", "autoPlayVoice"],
    (items) => {
      const url = items.apiUrl || "http://localhost:8000";
      apiUrlInput.value = url;
      loginApiUrl.value = url;

      if (items.voiceId) voiceIdSelect.value = items.voiceId;
      if (typeof items.autoPlayVoice !== "undefined") autoPlayCheckbox.checked = items.autoPlayVoice;

      if (items.authToken) {
        showAuthenticated(items);
      } else {
        showLogin();
      }

      checkServerStatus(url);
    }
  );

  function showAuthenticated(data) {
    loginView.style.display = "none";
    authView.style.display = "block";
    profName.innerText = data.userName || "Estudiante Guionbajo";
    profLevel.innerText = `Nivel: ${data.studentLevel || "B1"}`;
    profEmail.innerText = data.userEmail || "Sesión activa";
  }

  function showLogin() {
    loginView.style.display = "block";
    authView.style.display = "none";
  }

  function showToast(msg = "¡Listo!") {
    toast.innerText = msg;
    toast.style.display = "block";
    setTimeout(() => {
      toast.style.display = "none";
    }, 2200);
  }

  function showError(msg) {
    errBox.innerText = msg;
    errBox.style.display = "block";
    setTimeout(() => {
      errBox.style.display = "none";
    }, 4000);
  }

  async function checkServerStatus(url) {
    statusText.innerText = "Verificando...";
    statusDot.style.background = "#f59e0b";

    try {
      const resp = await fetch(`${url}/netflix/status`, { method: "GET" });
      if (resp.ok) {
        const data = await resp.json();
        statusDot.style.background = "#10b981";
        statusText.innerText = `Servidor Online (${data.llm_engine || "AI"})`;
        statusBadge.style.borderColor = "rgba(16, 185, 129, 0.4)";
      } else {
        throw new Error("HTTP " + resp.status);
      }
    } catch (e) {
      statusDot.style.background = "#ef4444";
      statusText.innerText = "Servidor Desconectado";
      statusBadge.style.borderColor = "rgba(239, 68, 68, 0.4)";
    }
  }

  // Handle Login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.style.display = "none";
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    const apiUrl = loginApiUrl.value.trim().replace(/\/$/, "");

    if (!email || !password) return;

    try {
      const resp = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!resp.ok) {
        throw new Error("Credenciales inválidas o correo no registrado.");
      }

      const tokenData = await resp.json();
      const token = tokenData.access_token;

      // Fetch user profile
      let userName = "Estudiante";
      let studentLevel = "B1";

      try {
        const meResp = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meResp.ok) {
          const meData = await meResp.json();
          userName = meData.name || "Estudiante";
          studentLevel = meData.native_language ? "B2.1" : "B1";
        }
      } catch (err) {
        console.warn("Could not fetch profile details:", err);
      }

      chrome.storage.local.set(
        {
          apiUrl,
          authToken: token,
          userEmail: email,
          userName,
          studentLevel,
        },
        () => {
          showAuthenticated({ userName, userEmail: email, studentLevel });
          showToast("¡Sesión iniciada con éxito!");
        }
      );
    } catch (err) {
      showError(err.message || "Error al iniciar sesión");
    }
  });

  // Handle Logout
  logoutBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["authToken", "userEmail", "userName"], () => {
      showLogin();
      showToast("Sesión cerrada");
    });
  });

  // Save Settings
  saveSettingsBtn.addEventListener("click", () => {
    const apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");
    const voiceId = voiceIdSelect.value;
    const autoPlayVoice = autoPlayCheckbox.checked;

    chrome.storage.local.set({ apiUrl, voiceId, autoPlayVoice }, () => {
      showToast("Ajustes guardados");
      checkServerStatus(apiUrl);
    });
  });
});
