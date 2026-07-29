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

// YouTube is moving this panel from Polymer "renderer" elements to Lit "view
// model" ones, and which generation a given client gets varies by rollout, so
// both spellings are kept — newest first. Every lookup walks its list in order
// rather than joining it with commas: querySelector on a comma-joined selector
// returns whichever match comes first in DOM order, not the first selector that
// hits, which loses the priority the order is meant to express.
const SEGMENT_SELECTORS = ['transcript-segment-view-model', 'ytd-transcript-segment-renderer'];
const SEGMENT_TEXT_SELECTORS = ['span[role="text"]', '.ytAttributedStringHost', '.segment-text'];

// A segment also carries a screen-reader label ("1 Minute, 7 Sekunden") next to
// the visible timestamp. It has to be kept out of both the timestamp and the
// text, or it ends up glued onto the transcript line. Note that
// .ytwTranscriptSegmentViewModelTimestamp is a distinct class token from
// ...TimestampA11yLabel, so it cannot match the label by accident.
const SEGMENT_TIMESTAMP_SELECTORS = ['.ytwTranscriptSegmentViewModelTimestamp', '.segment-timestamp'];
const A11Y_LABEL_SELECTOR = '[class*="A11yLabel"], [class*="a11y-label"]';
const TIMESTAMP_ONLY_RE = /^\d{1,2}(?::\d{2}){1,2}$/;

// The modern panel groups segments by chapter: one section element per chapter,
// its title in that section's #header, outside every segment. The title is not
// a segment and has no timestamp of its own, so it rides along on each segment
// instead of being spliced into the list as a synthetic one — that needs no
// invented `seconds` and survives the dedup map and the sort in
// loadAllSegments untouched. A panel without chapters yields null throughout,
// which is what the old generation produced implicitly.
const SECTION_SELECTORS = ['yt-item-section-renderer', 'ytd-item-section-renderer'];
const CHAPTER_TITLE_SELECTORS = ['.ytwTimelineChapterViewModelTitle', 'timeline-chapter-view-model', 'h3'];

const TRANSCRIPT_PANEL_SELECTORS = [
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
  'ytd-engagement-panel-section-list-renderer:has([data-target-id*="transcript"])',
];

function queryFirst(root, selectors) {
  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return null;
}

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// A watch page carries several engagement panels (chapters, transcript,
// description, …) and a neighbouring extension may add its own, so matching one
// is not the same as matching the right one — and picking the wrong one is
// silent and total: every read is scoped to it, comes back empty, and looks
// exactly like "the panel never loaded". Hence the order below: a candidate that
// actually holds segments wins over one that merely matches a selector.
function getTranscriptPanel() {
  const named = TRANSCRIPT_PANEL_SELECTORS.flatMap((selector) => [
    ...document.querySelectorAll(selector),
  ]);

  const withSegments = named.find((panel) => queryFirst(panel, SEGMENT_SELECTORS));
  if (withSegments) return withSegments;

  // No named candidate holds segments. If segments exist at all, whatever
  // container they live in is the right panel by definition, whatever YouTube
  // has renamed its target-id to this month.
  const segment = queryFirst(document, SEGMENT_SELECTORS);
  const derived = segment?.closest('ytd-engagement-panel-section-list-renderer');
  if (derived) return derived;

  // Nothing is rendered yet — before the click there are no segments to go by,
  // and transcriptExistsForVideo() still needs to know the panel exists.
  return named[0] || null;
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

// A segment renders as a timestamp plus a line of text. Reading them by class
// name is the happy path; when a class is renamed the fallbacks below keep the
// segment rather than letting it come back with empty text and get filtered
// away, which used to be indistinguishable from "the panel never loaded".
function findTimestampText(element) {
  const labelled = queryFirst(element, SEGMENT_TIMESTAMP_SELECTORS);
  if (labelled) return normalize(labelled.textContent);

  // Class names changed: any descendant that is nothing but a timestamp will do.
  // The screen-reader label fails that test, which is exactly the point.
  for (const child of element.querySelectorAll('*')) {
    const text = normalize(child.textContent);
    if (TIMESTAMP_ONLY_RE.test(text)) return text;
  }
  return '';
}

// The section spellings are comma-joined here on purpose: closest() walks
// ancestors and returns the nearest match, so there is no DOM-order-versus-list-
// order trap to avoid — only one generation is ever present above a segment.
function findChapterTitle(element) {
  const header = element.closest(SECTION_SELECTORS.join(','))?.querySelector('#header');
  if (!header) return null;
  return normalize(queryFirst(header, CHAPTER_TITLE_SELECTORS)?.textContent) || null;
}

function extractSegment(element) {
  const stamp = findTimestampText(element);
  let text = normalize(queryFirst(element, SEGMENT_TEXT_SELECTORS)?.textContent);

  if (!text) {
    // Both spellings gone: fall back to the segment's own text with the parts
    // that are not speech removed, rather than dropping the segment entirely.
    let whole = normalize(element.textContent);
    const noise = [stamp, normalize(element.querySelector(A11Y_LABEL_SELECTOR)?.textContent)];
    for (const fragment of noise) {
      if (fragment) whole = whole.replace(fragment, ' ');
    }
    text = normalize(whole);
  }

  return { text, seconds: stamp ? parseTimestamp(stamp) : null, chapter: findChapterTitle(element) };
}

// Segment generations are not mixed: the first spelling that matches anything
// wins, so a stray leftover element of the other generation can't interleave
// duplicate or empty lines into the transcript.
//
// Scoped to the panel, but never trapped inside it: if the panel we settled on
// holds nothing, the document is searched too rather than reporting an empty
// transcript. The tags searched are YouTube's own custom elements, so widening
// the search cannot pick up a neighbouring extension's markup.
function readTranscriptSegments() {
  const panel = getTranscriptPanel();

  for (const root of panel ? [panel, document] : [document]) {
    for (const selector of SEGMENT_SELECTORS) {
      const found = Array.from(root.querySelectorAll(selector));
      if (found.length > 0) return found.map(extractSegment).filter((segment) => segment.text);
    }
  }
  return [];
}

// Printed instead of failing silently: if this ever stops working again, the
// console says which of the assumptions broke — panel, segment element, or
// segment internals — rather than leaving only a user-facing error string.
function logTranscriptDiagnostics() {
  const panel = getTranscriptPanel();
  const root = panel || document;

  const counts = {};
  for (const selector of [
    ...SEGMENT_SELECTORS,
    ...SEGMENT_TEXT_SELECTORS,
    ...SEGMENT_TIMESTAMP_SELECTORS,
    'timeline-item-view-model',
    'yt-item-section-renderer',
    'ytd-transcript-segment-list-renderer',
    'ytd-transcript-renderer',
  ]) {
    counts[selector] = root.querySelectorAll(selector).length;
  }

  const tagsUnder = (element) =>
    element
      ? [
          ...new Set(
            Array.from(element.querySelectorAll('*'))
              .map((el) => el.tagName.toLowerCase())
              .filter((tag) => tag.includes('transcript') || tag.includes('segment'))
          ),
        ]
      : [];

  // Every panel on the page, with what it is called and whether it holds
  // segments: this is what tells "we picked the wrong panel" apart from "nothing
  // was ever rendered", and both from "the toggle was never found". Without it
  // the three look identical from the outside.
  const panels = Array.from(
    document.querySelectorAll('ytd-engagement-panel-section-list-renderer')
  ).map((element) => ({
    targetId: element.getAttribute('target-id'),
    visibility: element.getAttribute('visibility'),
    innerTargetIds: [
      ...new Set(
        Array.from(element.querySelectorAll('[data-target-id]')).map((el) =>
          el.getAttribute('data-target-id')
        )
      ),
    ],
    segments: SEGMENT_SELECTORS.map((selector) => element.querySelectorAll(selector).length),
    isChosen: element === panel,
  }));

  // The toggle lives in the description, which is a separate migration from the
  // panel's — so when the button is missing, what the description does offer is
  // the thing worth seeing.
  const description = document.querySelector('#structured-description, ytd-watch-metadata');

  console.warn('[yt-llm transcript] no readable segments', {
    panelFound: Boolean(panel),
    toggleFound: Boolean(findTranscriptToggle()),
    counts,
    segmentsInDocument: SEGMENT_SELECTORS.map((selector) => document.querySelectorAll(selector).length),
    panels,
    transcriptishTagsInPanel: tagsUnder(panel),
    transcriptishTagsInDescription: tagsUnder(description),
    firstSegmentHTML: queryFirst(root, SEGMENT_SELECTORS)?.outerHTML?.slice(0, 500) || null,
  });
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

  // The panel mounts and fetches its segments asynchronously, and on a slow
  // connection that takes noticeably longer than the panel appearing — so this
  // waits well past the point where the panel is visibly open. Only YouTube's
  // own segments count as success; another extension's panel is unreadable.
  for (let attempt = 0; attempt < 48; attempt += 1) {
    await sleep(250);
    if (readTranscriptSegments().length > 0) return true;
  }
  return false;
}

// Which element inside the panel owns the scrollbar has changed with the panel
// itself, so the name is only a hint and overflowing is the actual test —
// scrolling the wrong element silently loads nothing.
//
// The tiers are tried in list order rather than comma-joined, for the same
// reason as everywhere else in this file: querySelectorAll returns DOM order,
// and #content is the ancestor of the list, so a comma-joined query would offer
// it first even though the inner element is the one YouTube marks as scrollable
// (...HostEnableScroll). If the outer div ever overflows too, that order would
// win and scrolling it would move nothing.
const SCROLLER_SELECTORS = [
  '.ytSectionListRendererHostEnableScroll',
  'yt-section-list-renderer',
  'ytd-transcript-segment-list-renderer',
  '#content',
];

function findScroller(panel) {
  if (!panel) return null;

  const overflows = (element) => element.scrollHeight > element.clientHeight + 20;
  for (const selector of SCROLLER_SELECTORS) {
    const found = Array.from(panel.querySelectorAll(selector)).find(overflows);
    if (found) return found;
  }
  return panel;
}

// The panel may or may not virtualize its list depending on layout and length,
// so scroll it to the bottom until nothing new turns up.
//
// Segments are accumulated across reads rather than taken from the final one:
// a virtualized list unmounts the rows scrolled past, so the last snapshot
// alone would be just the tail of a long transcript. Keyed by timestamp+text,
// so a line repeated at a different point in the video is kept.
async function loadAllSegments(onProgress) {
  const panel = getTranscriptPanel();
  const scroller = findScroller(panel);

  const MAX_ITERATIONS = 40;
  const MAX_NO_GROWTH_ROUNDS = 3;

  const collected = new Map();
  const absorbVisible = () => {
    for (const segment of readTranscriptSegments()) {
      collected.set(`${segment.seconds}|${segment.text}`, segment);
    }
    return collected.size;
  };

  let previousCount = -1;
  let noGrowthRounds = 0;
  absorbVisible();

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    if (collected.size === previousCount) {
      noGrowthRounds += 1;
      if (noGrowthRounds >= MAX_NO_GROWTH_ROUNDS) break;
    } else {
      noGrowthRounds = 0;
    }
    previousCount = collected.size;

    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    await sleep(250);

    onProgress?.({ segments: absorbVisible() });
  }

  // Insertion order is reading order, which is already playback order unless
  // virtualization served rows out of order; sort when every timestamp parsed.
  const segments = [...collected.values()];
  if (segments.every((segment) => segment.seconds != null)) {
    segments.sort((a, b) => a.seconds - b.seconds);
  }
  return segments;
}

// Returns an array of { text, seconds, chapter } in playback order, or throws
// TRANSCRIPT_UNAVAILABLE / TRANSCRIPT_PANEL_BLOCKED (see the top of this file).
async function collectTranscript({ onProgress } = {}) {
  const opened = await openTranscriptPanel();
  if (!opened) {
    logTranscriptDiagnostics();
    throw new Error(transcriptExistsForVideo() ? TRANSCRIPT_PANEL_BLOCKED : TRANSCRIPT_UNAVAILABLE);
  }

  const segments = await loadAllSegments(onProgress);
  if (segments.length === 0) {
    logTranscriptDiagnostics();
    throw new Error(TRANSCRIPT_PANEL_BLOCKED);
  }
  return segments;
}
