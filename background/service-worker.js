// Minimal background worker:
// - opens the chosen LLM site in a new tab on request;
// - reflects collection progress on the extension icon (status) and badge
//   (comment count), so readiness is visible even when the popup is closed.

// Paths are resolved with chrome.runtime.getURL() into absolute
// chrome-extension://<id>/... URLs — a plain relative path like
// 'icons/icon16.png' resolves against the service worker script's own
// location (background/) in MV3, not the extension root, which silently
// 404s ("Failed to fetch") every time, not just intermittently.
function iconSet(paths) {
  const resolved = {};
  for (const [size, path] of Object.entries(paths)) {
    resolved[size] = chrome.runtime.getURL(path);
  }
  return resolved;
}

const DEFAULT_ICONS = iconSet({
  16: 'icons/icon16.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
});

const STATUS_ICONS = {
  collecting: iconSet({
    16: 'icons/status/icon16-collecting.png',
    48: 'icons/status/icon48-collecting.png',
    128: 'icons/status/icon128-collecting.png',
  }),
  done: iconSet({
    16: 'icons/status/icon16-done.png',
    48: 'icons/status/icon48-done.png',
    128: 'icons/status/icon128-done.png',
  }),
  error: iconSet({
    16: 'icons/status/icon16-error.png',
    48: 'icons/status/icon48-error.png',
    128: 'icons/status/icon128-error.png',
  }),
};

async function setStatusIcon(tabId, status) {
  const path = STATUS_ICONS[status] || DEFAULT_ICONS;
  try {
    await chrome.action.setIcon({ tabId, path });
  } catch (err) {
    console.error('[yt-llm background] setIcon failed', err?.message);
  }
}

function setBadge(tabId, text) {
  chrome.action.setBadgeText({ tabId, text });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OFFSCREEN_URL = 'offscreen/offscreen.html';
let creatingOffscreenDocument = null;

// Clipboard writes from a regular tab/popup require that document to have
// focus; an offscreen document is exempt from that, which is what makes
// copy reliable regardless of whether the popup or the YouTube tab has focus.
async function ensureOffscreenDocument() {
  if (chrome.offscreen.hasDocument && (await chrome.offscreen.hasDocument())) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ['CLIPBOARD'],
        justification: 'Write the collected comments prompt to the clipboard regardless of tab/window focus.',
      })
      .catch((err) => {
        // Chrome throws if a document already exists (race between callers);
        // that's fine, it just means we're already set up.
        if (!String(err?.message).includes('single offscreen')) throw err;
      })
      .finally(() => {
        creatingOffscreenDocument = null;
      });
  }
  await creatingOffscreenDocument;
}

async function copyViaOffscreenDocument(text) {
  await ensureOffscreenDocument();
  return chrome.runtime.sendMessage({ type: 'offscreen-write-clipboard', text });
}

// Best-effort: the text is already in the clipboard, so a failed/late paste
// here is never a user-facing failure — just a missed convenience.
async function sendTextOnceTabLoaded(tabId, text) {
  await new Promise((resolve) => {
    function onUpdated(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });

  // The page is "complete" but the SPA + our content script may still be
  // attaching; retry a few times before giving up.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await sleep(500);
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'paste-text', text });
      if (response?.ok) return;
    } catch (_err) {
      // No receiver yet — content script not attached, try again.
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'open-llm-tab' && message.url) {
    chrome.tabs.create({ url: message.url }, (tab) => {
      if (message.text && tab?.id != null) {
        sendTextOnceTabLoaded(tab.id, message.text);
      }
    });
    sendResponse?.({ ok: true });
    return true;
  }

  if (message?.type === 'copy-text' && typeof message.text === 'string') {
    copyViaOffscreenDocument(message.text)
      .then((response) => sendResponse?.(response))
      .catch((err) => {
        console.error('[yt-llm background] offscreen copy failed', err);
        sendResponse?.({ ok: false, reason: err?.message || 'offscreen-unavailable' });
      });
    return true;
  }

  if (message?.type === 'progress-update') {
    const tabId = sender.tab?.id;
    if (tabId == null) return true;

    (async () => {
      if (message.status === 'collecting') {
        await setStatusIcon(tabId, 'collecting');
        setBadge(tabId, String(message.filtered ?? 0));
      } else if (message.status === 'done') {
        await setStatusIcon(tabId, 'done');
        setBadge(tabId, '');
      } else if (message.status === 'error') {
        await setStatusIcon(tabId, 'error');
        setBadge(tabId, '!');
      } else if (message.status === 'clear') {
        await setStatusIcon(tabId, 'clear');
        setBadge(tabId, '');
      }
      sendResponse?.({ ok: true });
    })();
    return true;
  }

  return true;
});
