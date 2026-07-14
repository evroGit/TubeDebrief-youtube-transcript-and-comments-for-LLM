// DOM scraping of YouTube's comment section on a video watch page.
// Chosen over YouTube Data API: works instantly with zero setup, no API key,
// no quota, no OAuth — matches the "max simplicity" requirement of this extension.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCommentsRoot() {
  return document.querySelector('ytd-comments#comments');
}

function readVisibleCommentTexts() {
  // #content-text only exists on rendered (i.e. loaded) comments. Replies are
  // rendered only after their "View replies" button is clicked, so when
  // includeReplies is false we simply never click those buttons and this
  // selector naturally returns top-level comments only.
  return Array.from(document.querySelectorAll('ytd-comments #content-text')).map(
    (node) => node.textContent || ''
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

  const MAX_ITERATIONS = 60;
  const MAX_NO_GROWTH_ROUNDS = 5;

  let previousRawCount = -1;
  let noGrowthRounds = 0;
  let rawTexts = [];

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    window.scrollBy(0, 1400);
    await sleep(450);

    if (settings.includeReplies) {
      clickReplyExpanders();
      await sleep(300);
    }

    rawTexts = readVisibleCommentTexts();
    const filteredSoFar = filterComments(rawTexts, settings);
    const totalChars = filteredSoFar.reduce((sum, c) => sum + c.length, 0);

    onProgress?.({ raw: rawTexts.length, filtered: filteredSoFar.length });

    if (filteredSoFar.length >= settings.maxComments || totalChars >= settings.maxTotalChars) {
      break;
    }

    if (rawTexts.length === previousRawCount) {
      noGrowthRounds += 1;
      if (noGrowthRounds >= MAX_NO_GROWTH_ROUNDS) break;
    } else {
      noGrowthRounds = 0;
    }
    previousRawCount = rawTexts.length;
  }

  return rawTexts;
}
