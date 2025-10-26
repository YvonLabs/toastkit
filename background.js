// background.js

// We'll keep a timer so we can revert the icon after we show the burnt/flame icon.
let iconResetTimerId = null;

// ----------------------
// Utility: get active tab
// ----------------------
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ----------------------
// Helpers: URL / origin / domain
// ----------------------
function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Very simple "base domain": last two labels
// e.g. mail.proton.me -> proton.me
// e.g. app.example.co.uk -> co.uk (not perfect, but good enough for now
// given the explicit "may sign you out" warning)
function getBaseDomain(hostname) {
  if (!hostname) return null;
  const parts = hostname.split(".");
  if (parts.length < 2) return hostname;
  const last2 = parts.slice(-2).join(".");
  return last2;
}

// Build a list of relevant origins based on scope choice:
// scope === "origin": just the active tab's exact origin
// scope === "family": active origin, base domain, and some common sibling subdomains
function buildTargetOrigins(tabUrl, scope) {
  const urlObj = new URL(tabUrl);
  const protocol = urlObj.protocol; // "https:"
  const host = urlObj.hostname;     // "mail.proton.me"
  const base = getBaseDomain(host); // "proton.me"

  const origins = new Set();

  // always include the exact origin
  origins.add(`${protocol}//${host}`);

  if (scope === "family" && base) {
    // base domain (proton.me)
    origins.add(`${protocol}//${base}`);

    // common siblings - will no-op safely if they don't exist
    origins.add(`${protocol}//www.${base}`);
    origins.add(`${protocol}//mail.${base}`);
    origins.add(`${protocol}//account.${base}`);
    origins.add(`${protocol}//auth.${base}`);
    origins.add(`${protocol}//login.${base}`);
  }

  return Array.from(origins);
}

function patternFromOrigin(origin) {
  return `${origin}/*`;
}

// ----------------------
// Cookies: count + clear
// We try multiple candidate origins and cookie domains.
// ----------------------
async function getCookiesForOrigin(origin) {
  try {
    const cookies = await chrome.cookies.getAll({ url: origin });
    return cookies || [];
  } catch {
    return [];
  }
}

function cookieRemovalUrlFromCookie(cookie, fallbackOrigin) {
  // cookie.domain might start with ".proton.me". We want a valid URL host.
  let hostFromCookie = cookie.domain || "";
  hostFromCookie = hostFromCookie.replace(/^\./, ""); // strip leading dot

  try {
    const u = new URL(fallbackOrigin);
    // Prefer cookie's domain if possible, keep protocol from fallbackOrigin
    if (hostFromCookie) {
      return `${u.protocol}//${hostFromCookie}${cookie.path || "/"}`;
    }
  } catch {
    // ignore
  }

  // fallback to just origin + cookie.path
  return `${fallbackOrigin}${cookie.path || "/"}`;
}

async function clearCookiesForOrigins(origins) {
  let totalBefore = 0;
  let totalCleared = 0;

  // collect all cookies across candidate origins and dedupe
  const cookieKey = c => `${c.domain}|${c.path}|${c.name}|${c.storeId || ""}`;
  const allCookiesMap = new Map();

  for (const origin of origins) {
    const cookies = await getCookiesForOrigin(origin);
    for (const c of cookies) {
      totalBefore++;
      allCookiesMap.set(cookieKey(c), { cookie: c, origin });
    }
  }

  // attempt removal for each unique cookie
  for (const { cookie, origin } of allCookiesMap.values()) {
    const removalUrl = cookieRemovalUrlFromCookie(cookie, origin);
    try {
      const res = await chrome.cookies.remove({
        url: removalUrl,
        name: cookie.name,
        storeId: cookie.storeId
      });
      if (res) {
        totalCleared++;
      }
    } catch {
      // ignore failures for special cookies
    }
  }

  return { before: totalBefore, cleared: totalCleared };
}

// ----------------------
// Storage + service workers clearing
// We'll call browsingData.remove() on each target origin.
// ----------------------
async function clearStorageAndSW(origins, opts) {
  // opts: { storage:boolean, serviceWorkers:boolean }
  let storageRan = false;
  let swRan = false;

  for (const origin of origins) {
    const removalOptions = { origins: [origin] };
    const dataToRemove = {};

    if (opts.storage) {
      storageRan = true;
      dataToRemove.indexedDB = true;
      dataToRemove.localStorage = true;
      dataToRemove.cacheStorage = true;
      dataToRemove.webSQL = true;
      dataToRemove.fileSystems = true;
    }

    if (opts.serviceWorkers) {
      swRan = true;
      dataToRemove.serviceWorkers = true;
    }

    const any = Object.values(dataToRemove).some(Boolean);
    if (any) {
      await chrome.browsingData.remove(removalOptions, dataToRemove);
    }
  }

  return {
    storageCleared: storageRan,
    swCleared: swRan
  };
}

// ----------------------
// Permission reset ("Ask again" for location, mic, camera, notifications)
// We'll set each origin pattern to "ask"
// ----------------------
function setAsk(api, pattern) {
  return new Promise(resolve =>
    api.set({ primaryPattern: pattern, setting: "ask" }, resolve)
  );
}

async function resetPermissionsForOrigins(origins) {
  let ran = false;
  for (const origin of origins) {
    const pat = patternFromOrigin(origin);
    await Promise.all([
      setAsk(chrome.contentSettings.location, pat),
      setAsk(chrome.contentSettings.camera, pat),
      setAsk(chrome.contentSettings.microphone, pat),
      setAsk(chrome.contentSettings.notifications, pat)
    ]);
    ran = true;
  }
  return ran;
}

// ----------------------
// Toolbar feedback
// 1. flashBadge: show a blue ✓ briefly
// 2. showToastedIcon: swap icon to flame, then revert
// ----------------------
async function flashBadge(tabId, text = "✓") {
  try {
    await chrome.action.setBadgeText({ tabId, text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#2563eb" });
    setTimeout(() => chrome.action.setBadgeText({ tabId, text: "" }), 1200);
  } catch {
    // Some pages (chrome://) won't allow badge updates. Ignore quietly.
  }
}

function showToastedIcon() {
  if (iconResetTimerId !== null) {
    clearTimeout(iconResetTimerId);
    iconResetTimerId = null;
  }

  chrome.action.setIcon({
    path: {
      "16":  "icons/toast_burnt16.png",
      "32":  "icons/toast_burnt32.png",
      "48":  "icons/toast_burnt48.png",
      "128": "icons/toast_burnt128.png"
    }
  });

  iconResetTimerId = setTimeout(() => {
    chrome.action.setIcon({
      path: {
        "16":  "icons/toast16.png",
        "32":  "icons/toast32.png",
        "48":  "icons/toast48.png",
        "128": "icons/toast128.png"
      }
    });
    iconResetTimerId = null;
  }, 5000);
}

// ----------------------
// Core wipe
// flags = { scope, wipeCookies, wipeStorage, wipeSW, wipePerms }
// scope: "origin" | "family"
// ----------------------
async function resetCurrentSite(tab, flags) {
  if (!tab || !tab.url) throw new Error("No active tab");

  const origin = getOrigin(tab.url);
  const hostname = getHostname(tab.url);

  if (!origin || origin.startsWith("chrome")) {
    // We do not/cannot wipe chrome:// or chrome-extension:// pages.
    throw new Error("Unsupported URL");
  }

  // Build the set of origins we're allowed to touch based on scope.
  const targetOrigins = buildTargetOrigins(tab.url, flags.scope || "origin");

  // 1. Cookies
  let cookiesBefore = 0;
  let cookiesCleared = 0;
  if (flags.wipeCookies) {
    const cookieResult = await clearCookiesForOrigins(targetOrigins);
    cookiesBefore = cookieResult.before;
    cookiesCleared = cookieResult.cleared;
  }

  // 2. Storage + service workers
  const storageResult = await clearStorageAndSW(targetOrigins, {
    storage: flags.wipeStorage,
    serviceWorkers: flags.wipeSW
  });

  // 3. Permissions reset
  let permsRan = false;
  if (flags.wipePerms) {
    permsRan = await resetPermissionsForOrigins(targetOrigins);
  }

  // Visual toolbar feedback
  await flashBadge(tab.id, "✓");
  showToastedIcon();

  // Return structured result for popup.js
  return {
    ok: true,
    origin,
    hostname,
    scopeUsed: flags.scope || "origin",
    cookies: {
      ran: !!flags.wipeCookies,
      before: cookiesBefore,
      cleared: cookiesCleared
    },
    storage: {
      ran: !!flags.wipeStorage,
      cleared: storageResult.storageCleared
    },
    serviceWorkers: {
      ran: !!flags.wipeSW,
      cleared: storageResult.swCleared
    },
    perms: {
      ran: !!flags.wipePerms,
      reset: permsRan
    }
  };
}

// ----------------------
// Keyboard shortcut handler
// We'll treat the keyboard shortcut like "Dark + subdomains"
// ----------------------
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "reset-current-site") {
    const tab = await getActiveTab();
    try {
      await resetCurrentSite(tab, {
        scope: "family",
        wipeCookies: true,
        wipeStorage: true,
        wipeSW: true,
        wipePerms: true
      });
    } catch {
      // Ignore errors here (e.g. Unsupported URL)
    }
  }
});

// ----------------------
// Message bridge for popup.js
// popup.js calls chrome.runtime.sendMessage({ type: "RESET_NOW", payload: {...} })
// ----------------------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "RESET_NOW") {
    (async () => {
      try {
        const tab = await getActiveTab();

        // Default to full wipe of current site only if somehow no payload is sent.
        const p = msg.payload || {};
        const flags = {
          scope: p.scope || "origin",
          wipeCookies: !!p.wipeCookies,
          wipeStorage: !!p.wipeStorage,
          wipeSW: !!p.wipeSW,
          wipePerms: !!p.wipePerms
        };

        const result = await resetCurrentSite(tab, flags);
        sendResponse(result);
      } catch (e) {
        sendResponse({
          ok: false,
          error: String(e && e.message ? e.message : e)
        });
      }
    })();
    return true; // keep channel open for async sendResponse
  }
});
