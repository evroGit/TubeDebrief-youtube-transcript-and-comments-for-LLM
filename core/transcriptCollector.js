// DOM scraping of YouTube's own transcript panel on a video watch page.
// Same rationale as core/commentCollector.js: no API key, no quota, no OAuth —
// it reads what YouTube already rendered for the user.
//
// Depends on sleep() from core/commentCollector.js, which the manifest loads
// first (classic scripts sharing one global scope, same as storage.js relying
// on i18n.js).

// This video has no transcript to read at all — no panel, no control for one.
const TRANSCRIPT_UNAVAILABLE = 'transcript-unavailable';

// YouTube does offer a transcript here, but it never showed up after we asked
// for it. The usual cause is another transcript/summarizer extension answering
// the click with its own panel, which we can't read and can't prevent — so this
// is reported separately, with the manual workaround, instead of claiming the
// video has no captions.
const TRANSCRIPT_PANEL_BLOCKED = 'transcript-panel-blocked';

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

// Ordered most specific first and queried one at a time: a plain
// `<renderer> button` matches ANY button inside the section, including ones
// injected there by other transcript/summarizer extensions — and a single
// comma-joined querySelector would return whichever comes first in DOM order,
// not whichever selector is listed first. Clicking a foreign button opens that
// extension's own panel while YouTube's never mounts, which looks exactly like
// "this video has no transcript". YouTube's own control is wrapped in
// #primary-button / ytd-button-renderer, so those tiers match it and not a
// neighbour's injected markup.
const TRANSCRIPT_TOGGLE_SELECTORS = [
  'ytd-video-description-transcript-section-renderer #primary-button button',
  'ytd-video-description-transcript-section-renderer ytd-button-renderer button',
  'ytd-video-description-transcript-section-renderer button',
];

function findTranscriptToggle() {
  for (const selector of TRANSCRIPT_TOGGLE_SELECTORS) {
    const toggle = document.querySelector(selector);
    if (toggle) return toggle;
  }
  return null;
}

// Whether YouTube itself thinks this video has a transcript, independent of
// whether our click managed to open it: the engagement panel is rendered into
// the DOM (hidden) for videos that have captions. Used to tell a genuinely
// caption-less video apart from a panel we failed to open.
function transcriptExistsForVideo() {
  return Boolean(getTranscriptPanel() || findTranscriptToggle());
}

async function openTranscriptPanel() {
  if (readTranscriptSegments().length > 0) return true;

  // Only expand the description if the control isn't reachable already — every
  // extra synthetic click is another chance to set off someone else's UI.
  let toggle = findTranscriptToggle();
  if (!toggle) {
    expandDescription();
    await sleep(400);
    toggle = findTranscriptToggle();
  }
  if (!toggle) return false;

  toggle.click();

  // The panel mounts and fetches its segments asynchronously. Only YouTube's
  // own segments count — another extension's panel opening is not success.
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
// TRANSCRIPT_UNAVAILABLE / TRANSCRIPT_PANEL_BLOCKED (see the top of this file).
async function collectTranscript({ onProgress } = {}) {
  const opened = await openTranscriptPanel();
  if (!opened) {
    throw new Error(transcriptExistsForVideo() ? TRANSCRIPT_PANEL_BLOCKED : TRANSCRIPT_UNAVAILABLE);
  }

  const segments = await loadAllSegments(onProgress);
  if (segments.length === 0) throw new Error(TRANSCRIPT_PANEL_BLOCKED);
  return segments;
}
