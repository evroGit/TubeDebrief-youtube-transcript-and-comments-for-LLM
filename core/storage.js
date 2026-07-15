// Settings persistence via chrome.storage.local.
// Requires core/i18n.js to be loaded first (DEFAULT_UI_LANGUAGE, getDefaultPromptTemplate).

const DEFAULT_SETTINGS = {
  minChars: 150,
  minWords: 20,
  maxComments: 40,
  maxTotalChars: 60000,
  includeReplies: true,
  customLLMUrl: '',
  uiLanguage: DEFAULT_UI_LANGUAGE,
  promptTemplate: getDefaultPromptTemplate(DEFAULT_UI_LANGUAGE),
};

async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function saveSettings(partial) {
  await chrome.storage.local.set(partial);
}

// Holds the most recently built prompt so "Open <LLM>" can be clicked
// multiple times (for different targets) without re-running collection.
async function saveLastPrompt(text) {
  await chrome.storage.local.set({ lastPromptText: text, lastPromptSavedAt: Date.now() });
}

async function getLastPrompt() {
  const { lastPromptText } = await chrome.storage.local.get('lastPromptText');
  return lastPromptText || null;
}

// Keeps only the single most recent error (no growing log), so the popup can
// show what went wrong even after the on-page status text is gone.
async function saveLastError(message) {
  await chrome.storage.local.set({ lastError: { message, at: Date.now() } });
}

async function getLastError() {
  const { lastError } = await chrome.storage.local.get('lastError');
  return lastError || null;
}

async function clearLastError() {
  await chrome.storage.local.remove('lastError');
}
