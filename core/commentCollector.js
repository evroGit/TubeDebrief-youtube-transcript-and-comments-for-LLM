// DOM scraping of YouTube's comment section on a video watch page.
// Chosen over YouTube Data API: works instantly with zero setup, no API key,
// no quota, no OAuth — matches the "max simplicity" requirement of this extension.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCommentsRoot() {
  return document.querySelector('ytd-comments#comments');
}

// These item element names are generic Polymer/YouTube menu parts, reused by
// unrelated menus all over a watch page (the video's "..." menu, per-comment
// "..." menus, sidebar items) — so they are only ever queried within a known
// menu container. A document-wide query returns whichever such element comes
// first in DOM order, which is typically an item of a completely different
// (and closed) menu rather than an option of the dropdown just opened.
const SORT_OPTION_ITEMS = [
  'ytd-menu-service-item-renderer',
  'ytd-menu-navigation-item-renderer',
  'tp-yt-paper-item',
];

function findFirstSortOption(sortMenu) {
  // Within #sort-menu these items can only belong to the sort dropdown itself,
  // so no wrapper element needs to be named — one less selector to rot.
  const scoped = sortMenu.querySelector(SORT_OPTION_ITEMS.join(', '));
  if (scoped) return scoped;

  // Fallback for Polymer reparenting an iron-dropdown out of its host on open.
  // Narrowed to a dropdown that is currently open (Polymer marks closed ones
  // aria-hidden), so it still cannot reach into another, closed menu.
  return document.querySelector(
    SORT_OPTION_ITEMS.map(
      (item) => `tp-yt-iron-dropdown:not([aria-hidden="true"]) tp-yt-paper-listbox ${item}`
    ).join(', ')
  );
}

// The sort trigger/menu text is in whatever language YouTube's UI is set to,
// so matching by label would need a translation table. YouTube always lists
// "Top comments" first regardless of locale, so we open the dropdown and
// click the first option instead of matching text — locale-independent.
async function ensureTopCommentsSort() {
  const sortMenu = document.querySelector('ytd-comments-header-renderer #sort-menu');
  if (!sortMenu) return;

  const trigger = sortMenu.querySelector('yt-dropdown-menu #label') || sortMenu;
  trigger.click();
  await sleep(300);

  findFirstSortOption(sortMenu)?.click();
  await sleep(300);
}

function readVisibleComments() {
  // #content-text only exists on rendered (i.e. loaded) comments. Replies are
  // rendered only after their "View replies" button is clicked, so when
  // includeReplies is false we simply never click those buttons and this
  // selector naturally returns top-level comments only.
  return Array.from(document.querySelectorAll('ytd-comments ytd-comment-view-model, ytd-comments ytd-comment-renderer')).map(
    (container) => {
      const text = container.querySelector('#content-text')?.textContent || '';
      const likesText = container.querySelector('#vote-count-middle')?.textContent?.trim() || '';
      return { text, likes: likesText || '0' };
    }
  );
}

function clickReplyExpanders() {
  const buttons = document.querySelectorAll(
    'ytd-comments ytd-comment-replies-renderer #more-replies button, ' +
      'ytd-comments ytd-comment-replies-renderer tp-yt-paper-button#more-replies'
  );
  let clicked = 0;
  for (const button of buttons) {
    button.click();
    clicked += 1;
  }
  return clicked;
}

// Scrolls the page to progressively load comments, optionally expanding replies,
// stopping once the filtered result satisfies maxComments/maxTotalChars, the
// comment list stops growing, or a hard iteration cap is hit (safety net).
async function collectComments(settings, { onProgress } = {}) {
  const commentsRoot = getCommentsRoot();
  if (!commentsRoot) {
    throw new Error('Comments section not found on this page. Scroll down once to let it load, then retry.');
  }

  commentsRoot.scrollIntoView({ behavior: 'instant', block: 'start' });
  await sleep(600);
  await ensureTopCommentsSort();

  const MAX_ITERATIONS = 60;
  const MAX_NO_GROWTH_ROUNDS = 5;

  let previousRawCount = -1;
  let noGrowthRounds = 0;
  let rawComments = [];

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    window.scrollBy(0, 1400);
    await sleep(450);

    if (settings.includeReplies) {
      clickReplyExpanders();
      await sleep(300);
    }

    rawComments = readVisibleComments();
    const filteredSoFar = filterComments(rawComments, settings);
    const totalChars = filteredSoFar.reduce((sum, c) => sum + c.length, 0);

    onProgress?.({ raw: rawComments.length, filtered: filteredSoFar.length });

    if (filteredSoFar.length >= settings.maxComments || totalChars >= settings.maxTotalChars) {
      break;
    }

    if (rawComments.length === previousRawCount) {
      noGrowthRounds += 1;
      if (noGrowthRounds >= MAX_NO_GROWTH_ROUNDS) break;
    } else {
      noGrowthRounds = 0;
    }
    previousRawCount = rawComments.length;
  }

  return rawComments;
}
