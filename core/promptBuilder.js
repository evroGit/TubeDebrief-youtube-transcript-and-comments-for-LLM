// Builds the single large text blob to copy into an LLM chat.
// `template` is user-editable (options page) and supports placeholders
// {{videoTitle}}, {{videoUrl}}, {{count}}; the numbered comment list is
// always appended after it, since that part is mechanical, not instructional.

function fillPromptTemplate(template, comments, videoInfo) {
  return template
    .replaceAll('{{videoTitle}}', videoInfo?.title ? `Видео: "${videoInfo.title}"` : '')
    .replaceAll('{{videoUrl}}', videoInfo?.url ? `Ссылка: ${videoInfo.url}` : '')
    .replaceAll('{{count}}', String(comments.length));
}

function buildPrompt(comments, videoInfo, template) {
  const header = fillPromptTemplate(template || DEFAULT_PROMPT_TEMPLATE, comments, videoInfo).trim();
  const body = comments.map((comment, index) => `[${index + 1}] ${comment}`).join('\n');

  return `${header}\n\n${body}`;
}
