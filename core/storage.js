// Settings persistence via chrome.storage.local.
// Requires core/i18n.js to be loaded first (DEFAULT_UI_LANGUAGE, getDefaultPromptTemplate).

// contentSource defaults to 'comments' so an existing install keeps behaving
// exactly as before the transcript source was added; the transcript settings
// below only come into play once it is switched to 'transcript' or 'both'.
const DEFAULT_SETTINGS = {
  contentSource: DEFAULT_CONTENT_SOURCE,
  minChars: 150,
  minWords: 20,
  maxComments: 40,
  maxTotalChars: 60000,
  includeReplies: true,
  customLLMUrl: '',
  uiLanguage: DEFAULT_UI_LANGUAGE,
  transcriptTimestampInterval: 30,
  maxTranscriptChars: 100000,
  promptTemplate: getDefaultPromptTemplate(DEFAULT_UI_LANGUAGE, 'comments'),
  transcriptPromptTemplate: getDefaultPromptTemplate(DEFAULT_UI_LANGUAGE, 'transcript'),
  combinedPromptTemplate: getDefaultPromptTemplate(DEFAULT_UI_LANGUAGE, 'both'),
};

// Which stored template a Copy run should use. Keyed by what was actually
// collected rather than by the setting, so a 'both' run that found no
// transcript still gets comment-only instructions instead of a prompt that
// promises a transcript section that isn't there.
const PROMPT_TEMPLATE_KEYS = {
  comments: 'promptTemplate',
  transcript: 'transcriptPromptTemplate',
  both: 'combinedPromptTemplate',
};

function promptTemplateFor(settings, source) {
  return settings[PROMPT_TEMPLATE_KEYS[source] || PROMPT_TEMPLATE_KEYS.comments];
}

async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function saveSettings(partial) {
  await chrome.storage.local.set(partial);
}

function extractVideoId(url) {
  try {
    return new URL(url).searchParams.get('v');
  } catch {
    return null;
  }
}

// Holds the most recently built prompt so "Open <LLM>" can be clicked
// multiple times (for different targets) without re-running collection.
// The source video is stored alongside it so Open can refuse to reuse a
// prompt collected for a different video (see openLLMTarget).
async function saveLastPrompt(text, videoUrl) {
  await chrome.storage.local.set({
    lastPromptText: text,
    lastPromptVideoId: extractVideoId(videoUrl),
  });
}

async function getLastPrompt() {
  const { lastPromptText } = await chrome.storage.local.get('lastPromptText');
  return lastPromptText || null;
}

async function getLastPromptVideoId() {
  const { lastPromptVideoId } = await chrome.storage.local.get('lastPromptVideoId');
  return lastPromptVideoId || null;
}

// True only if a prompt was successfully collected for this exact video —
// drives whether "Open <LLM>" is enabled/disabled in the popup and on-page UI.
async function hasLastPromptForVideo(videoUrl) {
  const storedId = await getLastPromptVideoId();
  const currentId = extractVideoId(videoUrl);
  return Boolean(storedId && currentId && storedId === currentId);
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
