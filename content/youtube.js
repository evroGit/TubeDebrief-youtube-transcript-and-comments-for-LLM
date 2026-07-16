// Injects "Copy" + per-LLM "Open" buttons on YouTube watch pages.
// Copy runs the collect -> filter -> build prompt -> copy pipeline once and
// stores the result; each Open button reuses that stored prompt, so opening
// several different LLMs never re-runs collection.

const WRAPPER_ID = 'yt-llm-wrapper';
const COPY_BUTTON_ID = 'yt-llm-copy-button';
const COPY_CHECK_ID = 'yt-llm-copy-check';
const STATUS_ID = 'yt-llm-copy-status';
const OPEN_TARGETS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'custom'];
const OPEN_BUTTON_CLASS = 'yt-llm-open-button';

let mounting = false;

function getVideoInfo() {
  const titleNode = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1');
  return {
    title: titleNode?.textContent?.trim() || document.title,
    url: location.href,
  };
}

function setStatus(text, isError) {
  const status = document.getElementById(STATUS_ID);
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? '#e33' : '#3aa757';
}

function openButtonStyle() {
  return [
    'margin-left:6px',
    'padding:0 10px',
    'height:30px',
    'border-radius:15px',
    'border:1px solid #ccc',
    'background:#fff',
    'color:#065fd4',
    'font-size:12px',
    'font-weight:500',
    'cursor:pointer',
  ].join(';');
}

// Labels are baked in at mount time from the language saved at that moment;
// if the user changes the language later, a YouTube tab already open needs a
// reload to pick it up (documented limitation, not worth a live-sync layer).
function createWrapper(lang) {
  const wrapper = document.createElement('span');
  wrapper.id = WRAPPER_ID;
  wrapper.style.cssText = 'display:inline-flex;align-items:center;flex-wrap:wrap;';

  const copyButton = document.createElement('button');
  copyButton.id = COPY_BUTTON_ID;
  copyButton.style.cssText = [
    'margin-left:8px',
    'padding:0 16px',
    'height:36px',
    'border-radius:18px',
    'border:none',
    'background:#065fd4',
    'color:#fff',
    'font-size:14px',
    'font-weight:500',
    'cursor:pointer',
  ].join(';');

  const copyLabel = document.createElement('span');
  copyLabel.textContent = t(lang, 'buttonCopy');
  copyButton.appendChild(copyLabel);

  const copyCheck = document.createElement('span');
  copyCheck.id = COPY_CHECK_ID;
  copyCheck.textContent = ' ✓';
  copyCheck.style.cssText = 'display:none;color:#fff;font-weight:700;';
  copyButton.appendChild(copyCheck);

  copyButton.addEventListener('click', onCopyClick);
  wrapper.appendChild(copyButton);

  for (const targetKey of OPEN_TARGETS) {
    const label = targetKey === 'custom' ? 'Custom' : LLM_TARGETS[targetKey].label;
    const openButton = document.createElement('button');
    openButton.classList.add(OPEN_BUTTON_CLASS);
    openButton.textContent = `${t(lang, 'buttonOpenPrefix')} ${label}`;
    openButton.style.cssText = `${openButtonStyle()};opacity:0.5;cursor:default;`;
    openButton.disabled = true;
    openButton.addEventListener('click', () => onOpenClick(targetKey));
    wrapper.appendChild(openButton);
  }

  const status = document.createElement('span');
  status.id = STATUS_ID;
  status.style.cssText = 'margin-left:10px;font-size:13px;vertical-align:middle;';
  wrapper.appendChild(status);

  return wrapper;
}

// Reflects whether a prompt has actually been collected for the video
// currently on screen: enables/disables the Open buttons accordingly and
// shows/hides the checkmark on Copy. Called on mount, after navigating to a
// different video, and right after a successful Copy.
async function refreshButtonState() {
  const wrapper = document.getElementById(WRAPPER_ID);
  if (!wrapper) return;

  const matched = await hasLastPromptForVideo(location.href);

  wrapper.querySelectorAll(`.${OPEN_BUTTON_CLASS}`).forEach((button) => {
    button.disabled = !matched;
    button.style.opacity = matched ? '1' : '0.5';
    button.style.cursor = matched ? 'pointer' : 'default';
  });

  const copyCheck = document.getElementById(COPY_CHECK_ID);
  if (copyCheck) copyCheck.style.display = matched ? 'inline' : 'none';
}

async function onCopyClick() {
  const button = document.getElementById(COPY_BUTTON_ID);
  button.disabled = true;
  chrome.runtime.sendMessage({ type: 'progress-update', status: 'collecting', filtered: 0 });

  try {
    const settings = await getSettings();
    const lang = settings.uiLanguage;
    setStatus(t(lang, 'statusCollecting'), false);

    const rawComments = await collectComments(settings, {
      onProgress: ({ raw, filtered }) => {
        setStatus(t(lang, 'statusCollectingProgress', raw, filtered), false);
        chrome.runtime.sendMessage({ type: 'progress-update', status: 'collecting', filtered });
      },
    });

    const filtered = filterComments(rawComments, settings);
    if (filtered.length === 0) {
      const message = t(lang, 'statusNoComments');
      setStatus(message, true);
      await saveLastError(message);
      chrome.runtime.sendMessage({ type: 'progress-update', status: 'error' });
      return { ok: false, reason: message };
    }

    const prompt = buildPrompt(filtered, getVideoInfo(), settings.promptTemplate);
    const copied = await copyTextToClipboard(prompt);
    if (!copied) {
      const message = t(lang, 'statusCopyFailed');
      setStatus(message, true);
      await saveLastError(message);
      chrome.runtime.sendMessage({ type: 'progress-update', status: 'error' });
      return { ok: false, reason: message };
    }

    await saveLastPrompt(prompt, getVideoInfo().url);
    await clearLastError();
    await refreshButtonState();

    setStatus(t(lang, 'statusDone', filtered.length), false);
    chrome.runtime.sendMessage({ type: 'progress-update', status: 'done', filtered: filtered.length });
    return { ok: true, count: filtered.length };
  } catch (err) {
    console.error('[yt-llm] collect failed', err);
    const settings = await getSettings();
    const message = err?.message || t(settings.uiLanguage, 'statusErrorGeneric');
    setStatus(message, true);
    await saveLastError(message);
    chrome.runtime.sendMessage({ type: 'progress-update', status: 'error' });
    return { ok: false, reason: message };
  } finally {
    button.disabled = false;
  }
}

async function onOpenClick(targetKey) {
  const settings = await getSettings();
  const lang = settings.uiLanguage;
  const result = await openLLMTarget(targetKey, settings.customLLMUrl, location.href);

  if (!result.ok && result.reason === 'no-text') {
    const message = t(lang, 'statusFirstCopy');
    setStatus(message, true);
    await saveLastError(message);
  } else if (!result.ok && result.reason === 'no-url') {
    const message = t(lang, 'statusSetCustomUrl');
    setStatus(message, true);
    await saveLastError(message);
  } else if (!result.ok && result.reason === 'stale-video') {
    const message = t(lang, 'statusVideoChanged');
    setStatus(message, true);
    await saveLastError(message);
  }
}

async function mountButton() {
  if (document.getElementById(WRAPPER_ID) || mounting) return;

  const anchor =
    document.querySelector('#top-level-buttons-computed') ||
    document.querySelector('ytd-menu-renderer#menu');
  if (!anchor) return;

  mounting = true;
  try {
    const settings = await getSettings();
    if (document.getElementById(WRAPPER_ID)) return;
    anchor.appendChild(createWrapper(settings.uiLanguage));
    // Only reached the first time the wrapper is actually created for this
    // page — cheap, so no need to gate it further.
    await refreshButtonState();
  } finally {
    mounting = false;
  }
}

// YouTube is a SPA; watch pages load without a full page reload, so poll for
// the action-bar anchor and re-mount after in-page navigation. This fires on
// every DOM mutation, so it stays a plain (cheap, early-returning) mount —
// no storage reads here.
const observer = new MutationObserver(() => {
  if (location.pathname === '/watch') mountButton();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

// yt-navigate-finish fires once per actual video change (not per DOM
// mutation), so it's the right place to force a re-check: the wrapper may
// already exist (YouTube reused the anchor across the navigation), which
// would make mountButton() a no-op that skips its internal refresh above.
document.addEventListener('yt-navigate-finish', () => {
  if (location.pathname === '/watch') {
    mountButton().then(refreshButtonState);
    chrome.runtime.sendMessage({ type: 'progress-update', status: 'clear' });
  }
});

if (location.pathname === '/watch') mountButton().then(refreshButtonState);

// Lets the popup's "Copy" button trigger the same pipeline as the in-page
// button, without duplicating the collection logic.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'run-copy-for-llm') {
    onCopyClick().then((result) => sendResponse?.(result));
    return true;
  }
});
