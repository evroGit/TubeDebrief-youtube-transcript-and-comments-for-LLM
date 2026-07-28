// Local heuristic filter for YouTube comments. No network calls.

const EMOJI_ONLY_RE = /^[\s\p{Extended_Pictographic}\p{Emoji_Presentation}‍️]+$/u;
const URL_ONLY_RE = /^\s*(https?:\/\/|www\.)\S+\s*$/i;
const URL_RE = /https?:\/\/\S+/gi;

function stripUrls(text) {
  return text.replace(URL_RE, '').trim();
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function isEmojiOnly(text) {
  return EMOJI_ONLY_RE.test(text);
}

function isLinkOnly(text) {
  return URL_ONLY_RE.test(text);
}

// Applies minChars/minWords/emoji/link/empty checks and dedupes.
// `rawComments` is an array of { text, likes } (likes is YouTube's own
// formatted string, e.g. "1.2K", kept as-is to avoid locale-specific parsing).
// Returns filtered + trimmed-to-limits array of { text, likes, length },
// longest first — length is the proxy for substance this filter selects on,
// so the limits below spend their budget on the most substantial comments.
function filterComments(rawComments, settings) {
  const seen = new Set();
  const candidates = [];

  for (const raw of rawComments) {
    const text = (raw?.text || '').trim().replace(/\s+/g, ' ');
    if (!text) continue;
    if (isEmojiOnly(text)) continue;
    if (isLinkOnly(text)) continue;

    const withoutUrls = stripUrls(text);
    if (!withoutUrls) continue;

    if (withoutUrls.length < settings.minChars) continue;
    if (countWords(withoutUrls) < settings.minWords) continue;

    const dedupeKey = withoutUrls.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    candidates.push({ text: withoutUrls, likes: raw?.likes || '0', length: withoutUrls.length });
  }

  candidates.sort((a, b) => b.length - a.length);

  const result = [];
  let totalChars = 0;

  for (const comment of candidates) {
    if (result.length >= settings.maxComments) break;
    if (totalChars + comment.length > settings.maxTotalChars) continue;
    result.push(comment);
    totalChars += comment.length;
  }

  return result;
}
