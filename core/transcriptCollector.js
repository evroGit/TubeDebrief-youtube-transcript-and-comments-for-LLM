// DOM scraping of YouTube's own transcript panel on a video watch page.
// Same rationale as core/commentCollector.js: no API key, no quota, no OAuth —
// it reads what YouTube already rendered for the user.
//
// Depends on sleep() from core/commentCollector.js, which the manifest loads
// first (classic scripts sharing one global scope, same as storage.js relying
// on i18n.js).

// A transcript is only offered when the video actually has captions, so
// "button not found" and "no captions" are the same outcome for us. The caller
// maps this to the statusNoTranscript message.
const TRANSCRIPT_UNAVAILABLE = 'transcript-unavailable';

const TRANSCRIPT_PANEL_SELECTOR =
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]';
const TRANSCRIPT_SEGMENT_SELECTOR = 'ytd-transcript-segment-renderer';

function getTranscriptPanel() {
  return document.querySelector(TRANSCRIPT_PANEL_SELECTOR);
}

// "mm:ss" / "h:mm:ss" -> seconds. YouTube writes the timestamp with digits in
// every locale, so this needs no translation table.
function parseTimestamp(label) {
  const parts = label
    .trim()
    .split(':')
    .map((part) => Number.parseInt(part, 10));
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function readTranscriptSegments() {
  const panel = getTranscriptPanel();
  const root = panel || document;

  return Array.from(root.querySelectorAll(TRANSCRIPT_SEGMENT_SELECTOR))
    .map((segment) => {
      const text = segment.querySelector('.segment-text')?.textContent?.trim() || '';
      const stamp = segment.querySelector('.segment-timestamp')?.textContent || '';
      return { text, seconds: parseTimestamp(stamp) };
    })
    .filter((segment) => segment.text);
}

// The "Show transcript" button lives in the structured description, which has
// to be expanded first on most layouts. Both are matched structurally rather
// than by label text, so this stays locale-independent (see the sort-menu
// comment in core/commentCollector.js for the same reasoning).
function expandDescription() {
  const expander = document.querySelector(
    '#description-inline-expander #expand, ytd-text-inline-expander #expand'
  );
  expander?.click();
}

function findTranscriptToggle() {
  return document.querySelector(
    'ytd-video-description-transcript-section-renderer button, ' +
      '#structured-description ytd-video-description-transcript-section-renderer button'
  );
}

async function openTranscriptPanel() {
  if (readTranscriptSegments().length > 0) return true;

  expandDescription();
  await sleep(400);

  const toggle = findTranscriptToggle();
  if (!toggle) return false;

  toggle.click();

  // The panel mounts and fetches its segments asynchronously.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(250);
    if (readTranscriptSegments().length > 0) return true;
  }
  return false;
}

// The panel may or may not virtualize its list depending on layout and length,
// so scroll it to the bottom until the segment count stops growing. On a
// non-virtualized panel the first read already returns everything and this
// exits after the no-growth rounds without doing harm.
async function loadAllSegments(onProgress) {
  const panel = getTranscriptPanel();
  const scroller =
    panel?.querySelector('#content, ytd-transcript-segment-list-renderer, #segments-container') || panel;

  const MAX_ITERATIONS = 40;
  const MAX_NO_GROWTH_ROUNDS = 3;

  let segments = readTranscriptSegments();
  let previousCount = -1;
  let noGrowthRounds = 0;

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    if (segments.length === previousCount) {
      noGrowthRounds += 1;
      if (noGrowthRounds >= MAX_NO_GROWTH_ROUNDS) break;
    } else {
      noGrowthRounds = 0;
    }
    previousCount = segments.length;

    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    await sleep(250);

    segments = readTranscriptSegments();
    onProgress?.({ segments: segments.length });
  }

  return segments;
}

// Returns an array of { text, seconds } in playback order, or throws
// TRANSCRIPT_UNAVAILABLE if this video has no transcript to read.
async function collectTranscript({ onProgress } = {}) {
  const opened = await openTranscriptPanel();
  if (!opened) throw new Error(TRANSCRIPT_UNAVAILABLE);

  const segments = await loadAllSegments(onProgress);
  if (segments.length === 0) throw new Error(TRANSCRIPT_UNAVAILABLE);
  return segments;
}
