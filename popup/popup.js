const minCharsInput = document.getElementById('minChars');
const maxCommentsInput = document.getElementById('maxComments');
const includeRepliesInput = document.getElementById('includeReplies');
const customUrlInput = document.getElementById('customLLMUrl');
const copyButton = document.getElementById('copy-button');
const openCustomButton = document.getElementById('open-custom-button');
const statusEl = document.getElementById('status');
const optionsLink = document.getElementById('options-link');

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#c62828' : '#2e7d32';
}

async function loadForm() {
  const settings = await getSettings();
  minCharsInput.value = settings.minChars;
  maxCommentsInput.value = settings.maxComments;
  includeRepliesInput.checked = settings.includeReplies;
  customUrlInput.value = settings.customLLMUrl;
}

async function showLastErrorIfAny() {
  const lastError = await getLastError();
  if (!lastError) return;
  const time = new Date(lastError.at).toLocaleTimeString();
  setStatus(`Последняя ошибка (${time}): ${lastError.message}`, true);
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
  setStatus('Запускаю сбор комментариев…', false);

  await persistForm();

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.url?.includes('youtube.com/watch')) {
      const message = 'Откройте страницу видео на YouTube';
      setStatus(message, true);
      await saveLastError(message);
      return;
    }

    const result = await chrome.tabs.sendMessage(activeTab.id, { type: 'run-copy-for-llm' });
    if (result?.ok) {
      setStatus(`Готово: ${result.count} комментариев скопировано. Откройте LLM ниже.`, false);
    } else {
      setStatus(result?.reason || 'Не удалось скопировать — см. статус на странице YouTube', true);
    }
  } catch (err) {
    console.error('[yt-llm popup] failed', err);
    const message = 'Не удалось запустить сбор. Обновите страницу YouTube и попробуйте снова.';
    setStatus(message, true);
    await saveLastError(message);
  } finally {
    copyButton.disabled = false;
  }
});

async function handleOpen(targetKey, customUrl) {
  const result = await openLLMTarget(targetKey, customUrl);
  if (!result.ok && result.reason === 'no-text') {
    const message = 'Сначала нажмите Copy';
    setStatus(message, true);
    await saveLastError(message);
  } else if (!result.ok && result.reason === 'no-url') {
    const message = 'Укажите Custom URL';
    setStatus(message, true);
    await saveLastError(message);
  } else {
    setStatus('Открываю…', false);
  }
}

document.querySelectorAll('.open-targets button').forEach((button) => {
  button.addEventListener('click', () => handleOpen(button.dataset.target, null));
});

openCustomButton.addEventListener('click', async () => {
  await persistForm();
  handleOpen('custom', customUrlInput.value);
});

loadForm();
showLastErrorIfAny();
