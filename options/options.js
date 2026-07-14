const fields = {
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

async function load() {
  const settings = await getSettings();
  fields.minChars.value = settings.minChars;
  fields.minWords.value = settings.minWords;
  fields.maxComments.value = settings.maxComments;
  fields.maxTotalChars.value = settings.maxTotalChars;
  fields.includeReplies.checked = settings.includeReplies;
  fields.customLLMUrl.value = settings.customLLMUrl;
  fields.promptTemplate.value = settings.promptTemplate;
}

resetPromptButton.addEventListener('click', () => {
  fields.promptTemplate.value = DEFAULT_PROMPT_TEMPLATE;
});

saveButton.addEventListener('click', async () => {
  await saveSettings({
    minChars: Number(fields.minChars.value) || 0,
    minWords: Number(fields.minWords.value) || 0,
    maxComments: Number(fields.maxComments.value) || 1,
    maxTotalChars: Number(fields.maxTotalChars.value) || 1000,
    includeReplies: fields.includeReplies.checked,
    customLLMUrl: fields.customLLMUrl.value,
    promptTemplate: fields.promptTemplate.value,
  });
  savedLabel.textContent = 'Сохранено ✓';
  setTimeout(() => (savedLabel.textContent = ''), 1500);
});

load();
