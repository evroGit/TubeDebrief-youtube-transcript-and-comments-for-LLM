// Injects "Copy" + per-LLM "Open" buttons on YouTube watch pages.
// Copy runs the collect -> filter -> build prompt -> copy pipeline once and
// stores the result; each Open button reuses that stored prompt, so opening
// several different LLMs never re-runs collection.

const WRAPPER_ID = 'yt-llm-wrapper';
const COPY_BUTTON_ID = 'yt-llm-copy-button';
const STATUS_ID = 'yt-llm-copy-status';
const OPEN_TARGETS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'custom'];

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

function createWrapper() {
  const wrapper = document.createElement('span');
  wrapper.id = WRAPPER_ID;
  wrapper.style.cssText = 'display:inline-flex;align-items:center;flex-wrap:wrap;';

  const copyButton = document.createElement('button');
  copyButton.id = COPY_BUTTON_ID;
  copyButton.textContent = 'Copy';
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
  copyButton.addEventListener('click', onCopyClick);
  wrapper.appendChild(copyButton);

  for (const targetKey of OPEN_TARGETS) {
    const label = targetKey === 'custom' ? 'Custom' : LLM_TARGETS[targetKey].label;
    const openButton = document.createElement('button');
    openButton.textContent = `Open ${label}`;
    openButton.style.cssText = openButtonStyle();
    openButton.addEventListener('click', () => onOpenClick(targetKey));
    wrapper.appendChild(openButton);
  }

  const status = document.createElement('span');
  status.id = STATUS_ID;
  status.style.cssText = 'margin-left:10px;font-size:13px;vertical-align:middle;';
  wrapper.appendChild(status);

  return wrapper;
}

async function onCopyClick() {
  const button = document.getElementById(COPY_BUTTON_ID);
  button.disabled = true;
  setStatus('Собираю комментарии…', false);
  chrome.runtime.sendMessage({ type: 'progress-update', status: 'collecting', filtered: 0 });

  try {
    const settings = await getSettings();

    const rawTexts = await collectComments(settings, {
      onProgress: ({ raw, filtered }) => {
        setStatus(`Собрано ${raw} (подходит ${filtered})…`, false);
        chrome.runtime.sendMessage({ type: 'progress-update', status: 'collecting', filtered });
      },
    });

    const filtered = filterComments(rawTexts, settings);
    if (filtered.length === 0) {
      const message = 'Подходящих комментариев не найдено';
      setStatus(message, true);
      await saveLastError(message);
      chrome.runtime.sendMessage({ type: 'progress-update', status: 'error' });
      return { ok: false, reason: message };
    }

    const prompt = buildPrompt(filtered, getVideoInfo(), settings.promptTemplate);
    const copied = await copyTextToClipboard(prompt);
    if (!copied) {
      const message = 'Не удалось скопировать в буфер обмена';
      setStatus(message, true);
      await saveLastError(message);
      chrome.runtime.sendMessage({ type: 'progress-update', status: 'error' });
      return { ok: false, reason: message };
    }

    await saveLastPrompt(prompt);
    await clearLastError();

    setStatus(`Готово: ${filtered.length} комментариев скопировано. Выберите LLM →`, false);
    chrome.runtime.sendMessage({ type: 'progress-update', status: 'done', filtered: filtered.length });
    return { ok: true, count: filtered.length };
  } catch (err) {
    console.error('[yt-llm] collect failed', err);
    const message = err?.message || 'Ошибка сбора комментариев';
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
  const result = await openLLMTarget(targetKey, settings.customLLMUrl);

  if (!result.ok && result.reason === 'no-text') {
    const message = 'Сначала нажмите Copy';
    setStatus(message, true);
    await saveLastError(message);
  } else if (!result.ok && result.reason === 'no-url') {
    const message = 'Задайте Custom URL в настройках расширения';
    setStatus(message, true);
    await saveLastError(message);
  }
}

function mountButton() {
  if (document.getElementById(WRAPPER_ID)) return;

  const anchor =
    document.querySelector('#top-level-buttons-computed') ||
    document.querySelector('ytd-menu-renderer#menu');
  if (!anchor) return;

  anchor.appendChild(createWrapper());
}

// YouTube is a SPA; watch pages load without a full page reload, so poll for
// the action-bar anchor and re-mount after in-page navigation.
const observer = new MutationObserver(() => {
  if (location.pathname === '/watch') mountButton();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('yt-navigate-finish', () => {
  if (location.pathname === '/watch') {
    mountButton();
    chrome.runtime.sendMessage({ type: 'progress-update', status: 'clear' });
  }
});

if (location.pathname === '/watch') mountButton();

// Lets the popup's "Copy" button trigger the same pipeline as the in-page
// button, without duplicating the collection logic.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'run-copy-for-llm') {
    onCopyClick().then((result) => sendResponse?.(result));
    return true;
  }
});
