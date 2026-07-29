// Builds the single large text blob to copy into an LLM chat.
// `template` is user-editable (options page) and supports placeholders
// {{videoTitle}}, {{videoUrl}}, {{count}}; the transcript and/or the numbered
// comment list are always appended after it, since that part is mechanical,
// not instructional. Label words ("Video:", "Link:", etc.) live inside the
// per-language template itself (see core/i18n.js), not in this logic.

function fillPromptTemplate(template, comments, videoInfo) {
  return template
    .replaceAll('{{videoTitle}}', videoInfo?.title || '')
    .replaceAll('{{videoUrl}}', videoInfo?.url || '')
    .replaceAll('{{count}}', String(comments.length));
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(secs).padStart(2, '0')}`;
}

// Caption segments are ~2-5 seconds each, which as one line per segment is
// mostly timestamps by volume and reads as noise to an LLM. Grouping them into
// paragraphs that start no more often than every `intervalSeconds` keeps a
// usable time reference at a fraction of the character cost.
//
// A chapter boundary always starts its own group, whatever the interval: the
// heading has to sit above the text it introduces, and with timestamps switched
// off the transcript would otherwise collapse into a single paragraph and lose
// the structure YouTube already worked out. Segments carry no chapter on a panel
// that has none, which reproduces the previous grouping exactly.
function groupTranscriptSegments(segments, intervalSeconds) {
  const groups = [];
  let current = null;
  let chapter = null;

  for (const segment of segments) {
    const start = intervalSeconds ? segment.seconds : null;
    const newChapter = segment.chapter && segment.chapter !== chapter ? segment.chapter : null;
    const intervalElapsed =
      Boolean(intervalSeconds) &&
      (start == null || current?.start == null || start - current.start >= intervalSeconds);

    if (!current || newChapter || intervalElapsed) {
      current = { start, chapter: newChapter, parts: [] };
      groups.push(current);
    }
    if (newChapter) chapter = newChapter;
    current.parts.push(segment.text);
  }

  return groups.map((group) => ({
    start: group.start,
    chapter: group.chapter,
    text: group.parts.join(' '),
  }));
}

// Cuts at a paragraph boundary rather than mid-sentence, and says so in the
// text — a silently truncated transcript would have the LLM summarizing half a
// video as if it were the whole thing.
function formatTranscript(segments, settings, lang) {
  // A chapter heading is folded into its paragraph rather than pushed as an
  // entry of its own, so the budget below still counts every character it emits
  // and can never cut between a heading and the text it introduces.
  const paragraphs = groupTranscriptSegments(segments, settings.transcriptTimestampInterval).map(
    (group) => {
      const body = group.start == null ? group.text : `[${formatTimestamp(group.start)}] ${group.text}`;
      return group.chapter ? `## ${group.chapter}\n${body}` : body;
    }
  );

  const limit = settings.maxTranscriptChars;
  const kept = [];
  let totalChars = 0;
  let truncated = false;

  for (const paragraph of paragraphs) {
    const remaining = limit - totalChars;
    if (paragraph.length + 1 > remaining) {
      // Nothing kept yet means this paragraph alone is over the limit — with
      // timestamps switched off the whole transcript is one paragraph, so
      // stopping at the boundary here would drop it entirely. Hard-cut it
      // (at a word boundary) instead of returning just the marker.
      if (kept.length === 0 && remaining > 0) {
        const head = paragraph.slice(0, remaining);
        const lastSpace = head.lastIndexOf(' ');
        kept.push(lastSpace > 0 ? head.slice(0, lastSpace) : head);
      }
      truncated = true;
      break;
    }
    kept.push(paragraph);
    totalChars += paragraph.length + 1;
  }

  if (truncated) {
    kept.push(t(lang, 'transcriptTruncated', limit));
  }

  return kept.join('\n');
}

function formatComments(comments) {
  return comments
    .map((comment, index) => `[${index + 1}] (👍 ${comment.likes}, ${comment.length} chars) ${comment.text}`)
    .join('\n');
}

// `parts` is { transcript: segments|null, comments: array }. Section headers are
// only added when both are present — with a single source the template's own
// closing line ("Below is the transcript:") already introduces it, so a
// comments-only prompt stays byte-identical to what this built before.
function buildPrompt(parts, videoInfo, template, settings, lang) {
  const comments = parts.comments || [];
  const header = fillPromptTemplate(template, comments, videoInfo).trim();

  const transcriptText = parts.transcript ? formatTranscript(parts.transcript, settings, lang) : '';
  const useSectionHeaders = Boolean(transcriptText) && comments.length > 0;

  const blocks = [];
  if (transcriptText) {
    blocks.push(useSectionHeaders ? `${t(lang, 'sectionTranscript')}\n${transcriptText}` : transcriptText);
  }
  if (comments.length > 0) {
    const list = formatComments(comments);
    blocks.push(useSectionHeaders ? `${t(lang, 'sectionComments', comments.length)}\n${list}` : list);
  }

  return [header, ...blocks].join('\n\n');
}
