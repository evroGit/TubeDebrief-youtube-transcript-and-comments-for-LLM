const fields = {
  uiLanguage: document.getElementById('uiLanguage'),
  minChars: document.getElementById('minChars'),
  minWords: document.getElementById('minWords'),
  maxComments: document.getElementById('maxComments'),
  maxTotalChars: document.getElementById('maxTotalChars'),
  includeReplies: document.getElementById('includeReplies'),
  customLLMUrl: document.getElementById('customLLMUrl'),
  promptTemplate: document.getElementById('promptTemplate'),
};
const saveButton = document.getElementById('save');
const resetPromptButton = document.getElementById('reset-prompt');
const savedLabel = document.getElementById('saved');

function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  document.title = t(lang, 'optionsTitle');
}

async function load() {
  const settings = await getSettings();
  fields.uiLanguage.value = settings.uiLanguage;
  fields.minChars.value = settings.minChars;
  fields.minWords.value = settings.minWords;
  fields.maxComments.value = settings.maxComments;
  fields.maxTotalChars.value = settings.maxTotalChars;
  fields.includeReplies.checked = settings.includeReplies;
  fields.customLLMUrl.value = settings.customLLMUrl;
  fields.promptTemplate.value = settings.promptTemplate;
  applyTranslations(settings.uiLanguage);
}

// Switching language re-translates the page immediately, and — only if the
// prompt hasn't been customized away from a known default — swaps the prompt
// to that language's default too. A customized prompt is left alone so the
// language switch never silently discards the user's own wording.
fields.uiLanguage.addEventListener('change', () => {
  const lang = fields.uiLanguage.value;
  applyTranslations(lang);
  if (isKnownDefaultPromptTemplate(fields.promptTemplate.value)) {
    fields.promptTemplate.value = getDefaultPromptTemplate(lang);
  }
});

resetPromptButton.addEventListener('click', () => {
  fields.promptTemplate.value = getDefaultPromptTemplate(fields.uiLanguage.value);
});

saveButton.addEventListener('click', async () => {
  await saveSettings({
    uiLanguage: fields.uiLanguage.value,
    minChars: Number(fields.minChars.value) || 0,
    minWords: Number(fields.minWords.value) || 0,
    maxComments: Number(fields.maxComments.value) || 1,
    maxTotalChars: Number(fields.maxTotalChars.value) || 1000,
    includeReplies: fields.includeReplies.checked,
    customLLMUrl: fields.customLLMUrl.value,
    promptTemplate: fields.promptTemplate.value,
  });
  savedLabel.textContent = t(fields.uiLanguage.value, 'savedLabel');
  setTimeout(() => (savedLabel.textContent = ''), 1500);
});

load();
