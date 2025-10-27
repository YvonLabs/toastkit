document.addEventListener("DOMContentLoaded", () => {
  const runBtn = document.getElementById("run");
  const statsEl = document.getElementById("stats");
  const versionLabel = document.getElementById("versionLabel");
  const siteSettingsBtn = document.getElementById("siteSettings");

  // --- Advanced option checkboxes ---
  const optCookies = document.getElementById("optCookies");
  const optStorage = document.getElementById("optStorage");
  const optSW = document.getElementById("optSW");
  const optPerms = document.getElementById("optPerms");
  const optReload = document.getElementById("optReload");

  // --- Toast level radios (Light / Medium / Dark) ---
  const levelRadios = document.querySelectorAll('input[name="level"]');

  // --- Scope radios ("Current site only" vs "This site + all subdomains") ---
  const scopeRadios = document.querySelectorAll('input[name="scope"]');

  // --- Footer buttons ---
  const footerReportBtn = document.getElementById("footerReport");
  const footerWebsiteBtn = document.getElementById("footerWebsite");

  // -------------------------------------------------
  // Level presets → they just set defaults in Advanced
  // -------------------------------------------------
  function applyLevelPreset(level) {
    if (level === "light") {
      optCookies.checked = true;
      optStorage.checked = false;
      optSW.checked = false;
      optPerms.checked = false;
    } else if (level === "medium") {
      optCookies.checked = true;
      optStorage.checked = true;
      optSW.checked = false;
      optPerms.checked = false;
    } else if (level === "dark") {
      optCookies.checked = true;
      optStorage.checked = true;
      optSW.checked = true;
      optPerms.checked = true;
    }
    // We intentionally do not touch optReload here.
  }

  // When user clicks Light/Medium/Dark, update Advanced checkboxes.
  levelRadios.forEach(r => {
    r.addEventListener("change", () => {
      if (r.checked) {
        applyLevelPreset(r.value);
      }
    });
  });

  // Initialize Advanced checkboxes from whichever level starts checked.
  const initialLevel =
    document.querySelector('input[name="level"]:checked')?.value || "light";
  applyLevelPreset(initialLevel);

  // -------------------------------------------------
  // Version in footer
  // -------------------------------------------------
  const manifest = chrome.runtime.getManifest();
  if (manifest && manifest.version && versionLabel) {
    versionLabel.textContent = "v" + manifest.version;
  }

  // -------------------------------------------------
  // "Open Chrome site settings" button (per-site permissions UI)
  // -------------------------------------------------
  siteSettingsBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      chrome.tabs.create({
        url: `chrome://settings/content/siteDetails?site=${encodeURIComponent(
          tab.url
        )}`
      });
    }
  });

  // -------------------------------------------------
  // Toast button click
  // -------------------------------------------------
  runBtn.addEventListener("click", async () => {
    runBtn.disabled = true;
    const originalText = runBtn.textContent;
    runBtn.textContent = "Toasting...";

    // Snapshot current user intent at click time.
    const level =
      document.querySelector('input[name="level"]:checked')?.value || "light";

    const scope =
      document.querySelector('input[name="scope"]:checked')?.value || "origin";
      // "origin" (current site only) or "family" (this site + all subdomains)

    const wipeCookies = optCookies.checked;
    const wipeStorage = optStorage.checked;
    const wipeSW = optSW.checked;
    const wipePerms = optPerms.checked;
    const doReload = optReload.checked;

    try {
      // Ask background.js to actually perform the wipe.
      const resp = await chrome.runtime.sendMessage({
        type: "RESET_NOW",
        payload: {
          scope,
          wipeCookies,
          wipeStorage,
          wipeSW,
          wipePerms
        }
      });

      if (resp && resp.ok) {
        // Success
        runBtn.textContent = "Toasted ✓";

        // Build human-readable detail string from what background actually did.
        // resp.cookies: { ran, before, cleared }
        // resp.storage: { ran, cleared }
        // resp.serviceWorkers: { ran, cleared }
        // resp.perms: { ran, reset }
        // resp.scopeUsed: "origin" | "family"
        const detailParts = [];

        if (resp.cookies && resp.cookies.ran) {
          detailParts.push(
            `cookies (${resp.cookies.cleared}/${resp.cookies.before})`
          );
        }
        if (resp.storage && resp.storage.ran) {
          detailParts.push("storage");
        }
        if (resp.serviceWorkers && resp.serviceWorkers.ran) {
          detailParts.push("service workers");
        }
        if (resp.perms && resp.perms.ran) {
          detailParts.push("permissions reset");
        }

        const wipedSummary = detailParts.length
          ? detailParts.join(", ")
          : "cookies";

        const scopeLabel =
          resp.scopeUsed === "family"
            ? "scope: this site + subdomains"
            : "scope: current site";

        // Example final line:
        // Level: medium · Wiped: cookies (12/12), storage · scope: this site + subdomains · Tab reloaded
        function escapeHtml(str) {
          return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }
        const summaryLine =
          `Level: ${escapeHtml(level)} · Wiped: ${escapeHtml(wipedSummary)} · ${escapeHtml(scopeLabel)}` +
          (doReload ? " · Tab reloaded" : "");

        // Render status under the logo
        statsEl.innerHTML = `
          <div>
            <span class="badge-flame">Toasted</span>
            <strong>Cleaned:</strong> ${escapeHtml(resp.origin)}
          </div>
          <div class="hint">${summaryLine}</div>
        `;

        // If "Reload tab after reset" is checked, reload the active tab now.
        if (doReload) {
          chrome.tabs.reload();
        }
      } else {
        // Background responded with failure
        const msg = resp && resp.error ? resp.error : "Failed";

        if (msg.includes("Unsupported URL")) {
          // chrome://, chrome-extension://, etc.
          runBtn.textContent = originalText;
          statsEl.innerHTML = `
            <div style="color:#dc2626;font-weight:600;">Unsupported URL</div>
            <div class="hint">This page can't be toasted. Switch to a normal site (https://) and try again.</div>
          `;
        } else {
          runBtn.textContent = "Error";
          statsEl.innerHTML = `
            <span style="color:#dc2626;font-weight:600;">${msg}</span>
          `;
        }
      }
    } catch (err) {
      // sendMessage itself failed
      const msg = err && err.message ? err.message : "Failed";
      runBtn.textContent = "Error";
      statsEl.innerHTML = `
        <span style="color:#dc2626;font-weight:600;">${msg}</span>
      `;
    }

    // Re-enable the button so they can run again / try another site.
    setTimeout(() => {
      runBtn.disabled = false;
      runBtn.textContent = originalText;
    }, 1500);
  });

  // -------------------------------------------------
  // Footer links
  // -------------------------------------------------

  const BUG_URL = "https://github.com/YvonLabs/toastkit/issues/new";
  const WEBSITE_URL = "https://yvonlabs.github.io/";

  footerReportBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: BUG_URL });
  });

  footerWebsiteBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: WEBSITE_URL });
  });
});
