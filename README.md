# Copy YouTube Comments for LLM

*[Читать на русском](README.ru.md)*

Chrome extension: collects the comments and/or the transcript (captions) of the current YouTube video, builds one big prompt, and copies it to the clipboard — pasting it into ChatGPT/Claude/Gemini/Perplexity/DeepSeek is up to the user (or handled by the experimental auto-paste).

No batching, no LLM API integration, no mandatory side panel — maximum simplicity.

## How it works

1. Open a video at `youtube.com/watch...`.
2. Pick what to collect in the popup (`What to collect`): **comments**, **transcript**, or **both**. Comments is the default.
3. Click **"Copy"** — either the button on the page itself (next to like/dislike), or the one in the extension's popup.
4. If the transcript is wanted: the extension expands the description, opens YouTube's transcript panel, and reads its segments. Segments are grouped into paragraphs — a new `[mm:ss]` paragraph starts at most once every `transcriptTimestampInterval` seconds, so timestamps don't eat the whole prompt. When the video has chapters, YouTube groups the panel by chapter and each title is emitted as a `## ` heading above its paragraphs — a boundary always starts a new paragraph, even with timestamps switched off, and the prompt templates tell the LLM those lines are titles rather than speech.
5. If comments are wanted: the extension switches the comment sort to "Top comments", then scrolls the page, loading comments (and expanding replies, if enabled), until it collects enough comments / characters. A local filter drops empty, emoji-only, link-only, and duplicate comments, keeping only those at least `minChars`/`minWords` long. What survives is then ordered **longest first**, and `maxComments`/`maxTotalChars` are spent from the top of that order — so the "Top comments" sort decides which comments get *loaded*, while length decides which of them make it into the prompt and in what order.
6. A single text is assembled: instructions for the LLM (a separate template per mode) + the transcript and/or a numbered comment list like `[1] (👍 245, 87 chars) text...`, and saved (`chrome.storage.local`) as the "last copied text". When both sources end up in the prompt they are separated by `=== TRANSCRIPT ===` and `=== COMMENTS (N) ===` headers; with a single source no headers are added.
7. The text is copied to the clipboard.
8. **Separately**, as many times as you like, click any of **"Open ChatGPT" / "Open Claude" / "Open Gemini" / "Open Perplexity" / "Open DeepSeek"** — each opens a new tab with that site and tries to auto-paste the saved text into it. Collection isn't repeated — you can open all five LLMs in a row from a single Copy.
9. If auto-paste didn't work, paste manually (Ctrl+V) — the text is already in the clipboard.

Open buttons stay disabled (and Copy shows no checkmark) until a prompt has actually been collected for the video currently on screen — navigating to a different video without pressing Copy again re-disables them, so an Open click can never send a different video's stale prompt.

## What lands in the clipboard

In **both** mode, with the default template and `transcriptTimestampInterval` at 30:

```
You are analyzing a YouTube video: its transcript (captions) and the comments under it.
Video: "Why the numbers changed"
Link: https://www.youtube.com/watch?v=abc123

The transcript comes from captions and may be auto-generated: expect missing
punctuation and misheard words and names. Take that into account.
The comments were picked by a local length filter — not every comment under the
video, but the 2 most detailed ones.

In your answer return:
1. A short summary of the video itself, based on the transcript.
...

Below are the transcript and the comments:

=== TRANSCRIPT ===
[0:00] so the first thing to understand about this is that it was never really about the hardware
[0:31] and by 2019 the whole approach had shifted which is why the numbers look the way they do

=== COMMENTS (2) ===
[1] (👍 1.2K, 101 chars) I worked on exactly this problem for four years and the part everyone misses is the calibration drift.
[2] (👍 318, 90 chars) Great breakdown, though the 2019 figure is closer to 40% if you count the revised baseline.
```

Everything above `=== TRANSCRIPT ===` is the editable template; everything below it is assembled mechanically. Like counts come straight from YouTube as formatted strings (`1.2K`), unparsed, to avoid locale-specific number handling.

## Status icon and badge

The toolbar icon doubles as the progress indicator, so a Copy started from the page is visible even with the popup closed:

| Icon | Badge | Meaning |
|---|---|---|
| default | — | idle, or a new video was navigated to |
| collecting | count | collection in progress; the badge counts matching comments (or transcript segments) so far |
| done | — | a prompt was collected and copied for this video |
| error | `!` | collection failed; the popup shows the message |

The state is per tab. The last error is also kept in storage, so opening the popup after the fact still shows what went wrong instead of an empty status line.

## Data source: DOM scraping

DOM scraping of the YouTube page was chosen over the YouTube Data API because:

- no API key, OAuth, or quota needed;
- works right after install, with zero setup;
- the MVP doesn't need 100% comment completeness — only what's reachable without extra user actions.

Scrolling loads the comment feed in batches; if **Include replies** is enabled, the extension also clicks the "Show replies" buttons before collecting text. If the option is disabled, replies simply never get expanded and never enter the pool — no extra filtering needed.

The transcript is read from the same transcript panel YouTube shows the user behind its "Show transcript" button. The button and the panel are matched by DOM structure rather than by label text — matching text would need a translation table for every YouTube UI language. Only videos with captions (including auto-generated ones) have a transcript; without them the panel never opens, and the transcript mode says plainly that there is nothing to collect.

## Settings (chrome.storage.local)

| Setting | Where to change | Description |
|---|---|---|
| `contentSource` | popup / options | what to collect: `comments` / `transcript` / `both`. Defaults to `comments` — the behaviour from before the transcript source existed |
| `minChars` | popup / options | minimum comment length in characters |
| `minWords` | options | minimum word count |
| `maxComments` | popup / options | maximum number of selected comments |
| `maxTotalChars` | options | maximum total character volume of comments |
| `includeReplies` | popup / options | whether to collect replies to comments |
| `uiLanguage` | options | interface language (popup, options, buttons/statuses on the YouTube page) and prompt language: `ru` / `en` / `de` |
| `transcriptTimestampInterval` | options | a new `[mm:ss]` transcript paragraph starts at most once every N seconds. `0` — no timestamps at all (the whole transcript as one paragraph, or one per chapter if the video has chapters) |
| `maxTranscriptChars` | options | character cap for the transcript. Past it the transcript is cut at a paragraph boundary (or, when the whole transcript is one paragraph, at a word boundary) and marked as cut in the text |
| `promptTemplate` | options | LLM instructions for **comments** mode (placeholders `{{videoTitle}}`, `{{videoUrl}}`, `{{count}}`) |
| `transcriptPromptTemplate` | options | the same for **transcript** mode: asks for a summary and a topic breakdown with timestamps, and warns the LLM the text may be auto-generated |
| `combinedPromptTemplate` | options | the same for **both** mode: additionally asks where the comments agree with or contradict the video |
| `lastPromptText` | internal | the last collected text, used by all Open buttons |
| `lastPromptVideoId` | internal | the video id the last collected text belongs to, used to gate the Open buttons |
| `lastError` | internal | the single most recent error (message + timestamp), shown when the popup opens. Only the latest one is kept — no growing log |

All three prompt templates are editable in options, but only the selected mode's template is visible at a time — the others are saved as they are. On a language switch each template is swapped to that language's default only if it hasn't been customized yet; custom text is left untouched.

In **both** mode a missing transcript is not an error: a video without captions still has comments worth collecting, so the extension collects them, uses the comments template, and appends "transcript unavailable" to the status. Only collecting nothing at all is an error.

## Architecture

```
manifest.json
background/service-worker.js   — opens the LLM tab, waits for it to load, sends it the text for auto-paste; status icon + comment-count badge
content/youtube.js             — injects Copy + Open×5 buttons, orchestrates collect → filter → build → copy
content/autopaste.js           — experimental: pastes text into the ChatGPT/Claude/Gemini/Perplexity/DeepSeek input field
popup/popup.html, popup.js     — settings + Copy button + Open buttons for each LLM
options/options.html, options.js — full settings set
core/commentCollector.js       — scrolls the page, expands replies, collects raw text
core/transcriptCollector.js    — opens YouTube's transcript panel and reads its segments (text + timestamp + chapter)
core/filter.js                 — local heuristic filter + deduplication + limits
core/promptBuilder.js          — assembles the final text for the LLM
core/i18n.js                   — UI string and prompt template dictionary for ru/en/de, t(lang, key) function
core/clipboard.js              — writes to the clipboard via the offscreen document (fallback: navigator.clipboard / execCommand)
offscreen/offscreen.html, offscreen.js — offscreen document: writes to the clipboard without requiring tab focus / a user gesture (see the "clipboardWrite" manifest permission)
core/targets.js                — preset LLM chat URLs
core/storage.js                — wrapper over chrome.storage.local with defaults + last-text/video storage
core/openTarget.js             — shared "open an LLM with the last text" action, used by both the popup and the content script
```

`core/*` modules are loaded as plain classic scripts (no build/bundler — matches the "maximum simplicity" principle) and share a global scope within whichever context they're injected into (content script, or popup/options). The load order in `manifest.json` is therefore load-bearing: `core/i18n.js` must precede `core/storage.js` (whose defaults call `getDefaultPromptTemplate`), and `core/commentCollector.js` must precede `core/transcriptCollector.js` (which reuses its `sleep`).

There is no test suite. The side effect of having no bundler is that the pure modules — `filter.js`, `promptBuilder.js`, `i18n.js` — are plain globals with no `chrome.*` calls in them, so they can be loaded into a Node `vm` context and exercised directly (filtering, segment grouping, truncation, prompt assembly) without a browser. Everything that touches the DOM or `chrome.*` needs a real unpacked install to verify.

## Permissions, and why each one is needed

| Permission | Why |
|---|---|
| `storage` | settings, the last collected prompt, and the last error (`chrome.storage.local`) |
| `activeTab`, `scripting` | letting the popup's Copy button run the pipeline in the active YouTube tab |
| `offscreen`, `clipboardWrite` | writing to the clipboard from an offscreen document, which — unlike a tab or the popup — has no "document must be focused" requirement |
| `host_permissions` for `youtube.com` | injecting the Copy/Open buttons and reading comments and the transcript |
| `host_permissions` for the four LLM sites | the experimental auto-paste content script. Remove a site here and its Open button still opens the tab — only auto-paste stops |

No `tabs` permission, no remote code, and no network requests of the extension's own: everything it reads is already in the page.

## Installing as an unpacked extension

1. Open `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the folder containing this extension (where `manifest.json` lives).
5. Open any YouTube video — **"Copy"** and the **"Open ..."** buttons will appear next to the like button, or open the extension's popup via its toolbar icon.

**After any change to `manifest.json`** (e.g. adding a new domain to `host_permissions`), click **Reload** for the extension on `chrome://extensions` — otherwise new domains/content scripts won't be picked up.

## MVP limitations

- YouTube's DOM selectors may change — if the "Copy" button stops collecting comments, the `ytd-comments` structure has likely changed and the selectors in `core/commentCollector.js` need updating. The transcript panel is mid-migration from Polymer `ytd-*-renderer` elements to Lit `*-view-model` ones, and which generation a client gets varies by rollout, so `core/transcriptCollector.js` keeps both spellings in ordered lists (`SEGMENT_SELECTORS`, `SEGMENT_TEXT_SELECTORS`, `SEGMENT_TIMESTAMP_SELECTORS`, `TRANSCRIPT_PANEL_SELECTORS`, `SCROLLER_SELECTORS`, `CHAPTER_TITLE_SELECTORS`), newest first. Every lookup walks its list one selector at a time rather than joining it with commas — a comma-joined `querySelector` returns whichever match comes first in DOM order, not the first selector that hits, which throws away the priority the order encodes. To add a generation, prepend to the relevant list. When nothing readable is found, `logTranscriptDiagnostics()` prints to the console which assumption broke — panel, segment element, or segment internals — so start there rather than guessing.
- Collection doesn't guarantee 100% of a video's comments — only what scrolling manages to load within a reasonable number of iterations.
- The caption track's language isn't selectable: whichever track YouTube opens in the panel by default is the one that gets read. If a video has several tracks and you need a specific one, switch it in the transcript panel by hand and press Copy again.
- Another installed transcript/summarizer extension can answer the "Show transcript" click with its own panel, so YouTube's never mounts and there is nothing for this extension to read. The toggle selectors target YouTube's own button wrapper specifically to avoid clicking a neighbour's injected control, but an extension that intercepts YouTube's own button can't be prevented. This case is reported separately from "no transcript available", with the workaround: open the native transcript panel on the page by hand and press Copy again — an already-open panel is read as-is, with no click of ours involved.
- Auto-generated captions arrive without punctuation or capitalization and with misheard words and names — transcript quality sets summary quality. The transcript prompt templates warn the LLM about this explicitly, but they can't recover what the recognizer lost.
- A long video's transcript may not fit in one prompt: an hour of video runs to roughly 50,000 characters, and past `maxTranscriptChars` the text is cut with a marker. There is no chunking (map-reduce over parts) — that would contradict the "one paste, no API" principle.
- Auto-pasting text into the LLM chat isn't a core guarantee — it's implemented as an **experimental bonus** (`content/autopaste.js`) for ChatGPT/Claude/Gemini/Perplexity/DeepSeek: after the tab opens and finishes loading, the extension tries to find the input field and paste the text into it. If the site's selectors change and pasting fails, that's not considered a pipeline error — the text is already in the clipboard and can be pasted manually (Ctrl+V).
- The language of the buttons on the YouTube page is fixed at the moment they're created (on load/navigation to a video). If you change the language in options while a YouTube tab is already open, the page's buttons only update after that tab is reloaded — the popup updates immediately every time it's opened.
- `uiLanguage` does not reach the manifest: the extension's name and description are hardcoded (and the description is Russian only), so they stay as-is in `chrome://extensions` and in the Web Store regardless of the selected language. Localizing them needs `_locales/` plus `default_locale` and `__MSG_*` references, which this MVP doesn't set up.
