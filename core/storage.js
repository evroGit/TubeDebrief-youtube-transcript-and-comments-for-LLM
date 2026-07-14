// Settings persistence via chrome.storage.local

// Placeholders {{videoTitle}}, {{videoUrl}}, {{count}} are substituted by
// core/promptBuilder.js; the numbered comment list is appended after this.
const DEFAULT_PROMPT_TEMPLATE = `Ты анализируешь комментарии под YouTube-видео.
{{videoTitle}}
{{videoUrl}}

Выдели среди комментариев:
- содержательные комментарии по теме видео;
- личный опыт и личные истории авторов;
- тематические наблюдения и мнения по существу.

Отбрось при анализе:
- короткие и бессодержательные реплики;
- generic-похвалу без содержания ("круто", "супер видео" и т.п.);
- оффтоп, не относящийся к теме видео.

В ответе верни:
1. Общий summary обсуждения в комментариях.
2. Лучшие комментарии (переведи на русский, если нужно) и краткий summary под каждым из комментариев.

Ниже {{count}} комментариев:`;

const DEFAULT_SETTINGS = {
  minChars: 100,
  minWords: 15,
  maxComments: 40,
  maxTotalChars: 60000,
  includeReplies: true,
  customLLMUrl: '',
  promptTemplate: DEFAULT_PROMPT_TEMPLATE,
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
