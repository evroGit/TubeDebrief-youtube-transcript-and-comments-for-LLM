// Builds the single large text blob to copy into an LLM chat.
// `template` is user-editable (options page) and supports placeholders
// {{videoTitle}}, {{videoUrl}}, {{count}}; the numbered comment list is
// always appended after it, since that part is mechanical, not instructional.
// Label words ("Video:", "Link:", etc.) live inside the per-language template
// itself (see core/i18n.js), not in this substitution logic.

function fillPromptTemplate(template, comments, videoInfo) {
  return template
    .replaceAll('{{videoTitle}}', videoInfo?.title || '')
    .replaceAll('{{videoUrl}}', videoInfo?.url || '')
    .replaceAll('{{count}}', String(comments.length));
}

function buildPrompt(comments, videoInfo, template) {
  const header = fillPromptTemplate(template || getDefaultPromptTemplate(DEFAULT_UI_LANGUAGE), comments, videoInfo).trim();
  const body = comments.map((comment, index) => `[${index + 1}] ${comment}`).join('\n');

  return `${header}\n\n${body}`;
}
