const fields = {
  uiLanguage: document.getElementById('uiLanguage'),
  contentSource: document.getElementById('contentSource'),
  minChars: document.getElementById('minChars'),
  minWords: document.getElementById('minWords'),
  maxComments: document.getElementById('maxComments'),
  maxTotalChars: document.getElementById('maxTotalChars'),
  includeReplies: document.getElementById('includeReplies'),
  transcriptTimestampInterval: document.getElementById('transcriptTimestampInterval'),
  maxTranscriptChars: document.getElementById('maxTranscriptChars'),
  promptTemplate: document.getElementById('promptTemplate'),
  transcriptPromptTemplate: document.getElementById('transcriptPromptTemplate'),
  combinedPromptTemplate: document.getElementById('combinedPromptTemplate'),
};
const saveButton = document.getElementById('save');
const resetPromptButton = document.getElementById('reset-prompt');
const savedLabel = document.getElementById('saved');
const promptLabel = document.getElementById('prompt-label');

// Each source has its own instructions, but showing three textareas at once
// would be noise — only the selected source's prompt is visible, and the label
// says which one it is. All three are still saved on every Save, so an
// unselected source keeps whatever was customized for it.
const PROMPT_LABEL_KEYS = {
  comments: 'labelPromptComments',
  transcript: 'labelPromptTranscript',
  both: 'labelPromptBoth',
};

function activePromptTextarea() {
  return document.querySelector(`textarea[data-source="${fields.contentSource.value}"]`);
}

function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  document.title = t(lang, 'optionsTitle');
  promptLabel.textContent = t(lang, PROMPT_LABEL_KEYS[fields.contentSource.value]);
}

// Comment-only limits and transcript-only limits each hide when the selected
// source can't use them; in 'both' mode everything applies.
function syncSourceVisibility() {
  const source = fields.contentSource.value;

  document.querySelectorAll('.comment-setting').forEach((el) => {
    el.style.display = source === 'transcript' ? 'none' : '';
  });
  document.querySelectorAll('.transcript-setting').forEach((el) => {
    el.style.display = source === 'comments' ? 'none' : '';
  });
  document.querySelectorAll('textarea[data-source]').forEach((el) => {
    el.style.display = el.dataset.source === source ? '' : 'none';
  });
}

async function load() {
  const settings = await getSettings();
  fields.uiLanguage.value = settings.uiLanguage;
  fields.contentSource.value = settings.contentSource;
  fields.minChars.value = settings.minChars;
  fields.minWords.value = settings.minWords;
  fields.maxComments.value = settings.maxComments;
  fields.maxTotalChars.value = settings.maxTotalChars;
  fields.includeReplies.checked = settings.includeReplies;
  fields.transcriptTimestampInterval.value = settings.transcriptTimestampInterval;
  fields.maxTranscriptChars.value = settings.maxTranscriptChars;
  fields.promptTemplate.value = settings.promptTemplate;
  fields.transcriptPromptTemplate.value = settings.transcriptPromptTemplate;
  fields.combinedPromptTemplate.value = settings.combinedPromptTemplate;
  syncSourceVisibility();
  applyTranslations(settings.uiLanguage);
}

fields.contentSource.addEventListener('change', () => {
  syncSourceVisibility();
  applyTranslations(fields.uiLanguage.value);
});

// Switching language re-translates the page immediately, and — for each prompt
// that hasn't been customized away from a known default — swaps it to that
// language's default too. A customized prompt is left alone so the language
// switch never silently discards the user's own wording.
fields.uiLanguage.addEventListener('change', () => {
  const lang = fields.uiLanguage.value;
  applyTranslations(lang);

  document.querySelectorAll('textarea[data-source]').forEach((textarea) => {
    if (isKnownDefaultPromptTemplate(textarea.value)) {
      textarea.value = getDefaultPromptTemplate(lang, textarea.dataset.source);
    }
  });
});

resetPromptButton.addEventListener('click', () => {
  const textarea = activePromptTextarea();
  textarea.value = getDefaultPromptTemplate(fields.uiLanguage.value, textarea.dataset.source);
});

saveButton.addEventListener('click', async () => {
  await saveSettings({
    uiLanguage: fields.uiLanguage.value,
    contentSource: fields.contentSource.value,
    minChars: Number(fields.minChars.value) || 0,
    minWords: Number(fields.minWords.value) || 0,
    maxComments: Number(fields.maxComments.value) || 1,
    maxTotalChars: Number(fields.maxTotalChars.value) || 1000,
    includeReplies: fields.includeReplies.checked,
    // 0 is meaningful here (no timestamps at all), so it must survive the
    // "empty input" fallback that the other numeric fields use.
    transcriptTimestampInterval: Math.max(0, Number(fields.transcriptTimestampInterval.value) || 0),
    maxTranscriptChars: Number(fields.maxTranscriptChars.value) || 1000,
    promptTemplate: fields.promptTemplate.value,
    transcriptPromptTemplate: fields.transcriptPromptTemplate.value,
    combinedPromptTemplate: fields.combinedPromptTemplate.value,
  });
  savedLabel.textContent = t(fields.uiLanguage.value, 'savedLabel');
  setTimeout(() => (savedLabel.textContent = ''), 1500);
});

load();
