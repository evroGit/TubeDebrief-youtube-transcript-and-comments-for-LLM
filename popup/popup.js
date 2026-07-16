const minCharsInput = document.getElementById('minChars');
const maxCommentsInput = document.getElementById('maxComments');
const includeRepliesInput = document.getElementById('includeReplies');
const customUrlInput = document.getElementById('customLLMUrl');
const copyButton = document.getElementById('copy-button');
const openCustomButton = document.getElementById('open-custom-button');
const statusEl = document.getElementById('status');
const optionsLink = document.getElementById('options-link');
const copyCheck = document.getElementById('copy-check');

let currentLang = DEFAULT_UI_LANGUAGE;

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#c62828' : '#2e7d32';
}

function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  document.querySelectorAll('.open-targets button').forEach((button) => {
    button.textContent = `${t(lang, 'buttonOpenPrefix')} ${button.dataset.target === 'custom' ? 'Custom' : LLM_TARGETS[button.dataset.target].label}`;
  });
  openCustomButton.textContent = t(lang, 'buttonOpenPrefix');
  customUrlInput.placeholder = t(lang, 'placeholderCustomUrl');
}

async function loadForm() {
  const settings = await getSettings();
  currentLang = settings.uiLanguage;
  minCharsInput.value = settings.minChars;
  maxCommentsInput.value = settings.maxComments;
  includeRepliesInput.checked = settings.includeReplies;
  customUrlInput.value = settings.customLLMUrl;
  applyTranslations(currentLang);
}

// Open <LLM> only makes sense once a prompt was actually collected for the
// video on the active tab — otherwise it would silently reuse whatever
// prompt happens to be stored from a different video.
function setOpenButtonsEnabled(enabled) {
  document.querySelectorAll('.open-targets button, #open-custom-button').forEach((button) => {
    button.disabled = !enabled;
  });
  copyCheck.style.display = enabled ? 'inline' : 'none';
}

async function refreshOpenButtonsState() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  setOpenButtonsEnabled(await hasLastPromptForVideo(activeTab?.url));
}

async function showLastErrorIfAny() {
  const lastError = await getLastError();
  if (!lastError) return;
  const time = new Date(lastError.at).toLocaleTimeString();
  setStatus(t(currentLang, 'statusLastError', time, lastError.message), true);
}

async function persistForm() {
  await saveSettings({
    minChars: Number(minCharsInput.value) || 0,
    maxComments: Number(maxCommentsInput.value) || 1,
    includeReplies: includeRepliesInput.checked,
    customLLMUrl: customUrlInput.value,
  });
}

[minCharsInput, maxCommentsInput, includeRepliesInput, customUrlInput].forEach((el) => {
  el.addEventListener('change', persistForm);
});

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Copy only collects + copies + stores the prompt. Opening an LLM is a
// separate action below, so the user can open several LLMs from one Copy run
// without re-running collection each time.
copyButton.addEventListener('click', async () => {
  copyButton.disabled = true;
  setStatus(t(currentLang, 'statusCollecting'), false);

  await persistForm();

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.url?.includes('youtube.com/watch')) {
      const message = t(currentLang, 'statusOpenYouTube');
      setStatus(message, true);
      await saveLastError(message);
      return;
    }

    const result = await chrome.tabs.sendMessage(activeTab.id, { type: 'run-copy-for-llm' });
    if (result?.ok) {
      setStatus(t(currentLang, 'statusDonePopup', result.count), false);
      setOpenButtonsEnabled(true);
    } else {
      setStatus(result?.reason || t(currentLang, 'statusCopyFailed'), true);
    }
  } catch (err) {
    console.error('[yt-llm popup] failed', err);
    const message = t(currentLang, 'statusCopyRunFailed');
    setStatus(message, true);
    await saveLastError(message);
  } finally {
    copyButton.disabled = false;
  }
});

async function handleOpen(targetKey, customUrl) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const result = await openLLMTarget(targetKey, customUrl, activeTab?.url);
  if (!result.ok && result.reason === 'no-text') {
    const message = t(currentLang, 'statusFirstCopy');
    setStatus(message, true);
    await saveLastError(message);
  } else if (!result.ok && result.reason === 'no-url') {
    const message = t(currentLang, 'statusSetCustomUrlPopup');
    setStatus(message, true);
    await saveLastError(message);
  } else if (!result.ok && result.reason === 'stale-video') {
    const message = t(currentLang, 'statusVideoChanged');
    setStatus(message, true);
    await saveLastError(message);
  } else {
    setStatus(t(currentLang, 'statusOpening'), false);
  }
}

document.querySelectorAll('.open-targets button').forEach((button) => {
  button.addEventListener('click', () => handleOpen(button.dataset.target, null));
});

openCustomButton.addEventListener('click', async () => {
  await persistForm();
  handleOpen('custom', customUrlInput.value);
});

loadForm().then(showLastErrorIfAny);
refreshOpenButtonsState();
