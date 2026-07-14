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
// Returns filtered + trimmed-to-limits array of comment strings, longest first if preferLonger.
function filterComments(rawComments, settings, { preferLonger = true } = {}) {
  const seen = new Set();
  const candidates = [];

  for (const raw of rawComments) {
    const text = (raw || '').trim().replace(/\s+/g, ' ');
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

    candidates.push(withoutUrls);
  }

  if (preferLonger) {
    candidates.sort((a, b) => b.length - a.length);
  }

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
