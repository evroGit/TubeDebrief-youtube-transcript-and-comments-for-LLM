# Copy YouTube Comments for LLM

*[Читать на русском](README.ru.md)*

Chrome extension: collects the comments under the current YouTube video, filters them with a local heuristic, builds one big prompt, and copies it to the clipboard — pasting it into ChatGPT/Claude/Gemini/Perplexity is up to the user (or handled by the experimental auto-paste).

No batching, no LLM API integration, no mandatory side panel — maximum simplicity.

## How it works

1. Open a video at `youtube.com/watch...`.
2. Click **"Copy"** — either the button on the page itself (next to like/dislike), or the one in the extension's popup.
3. The extension switches the comment sort to "Top comments" (if not already selected), then scrolls the page, loading comments (and expanding replies, if enabled), until it collects enough comments / characters.
4. A local filter drops empty, emoji-only, link-only, and duplicate comments, keeping only those at least `minChars`/`minWords` long.
5. A single text is assembled: instructions for the LLM + a numbered comment list like `[1] (👍 245, 87 chars) text...`, and saved (`chrome.storage.local`) as the "last copied text".
6. The text is copied to the clipboard.
7. **Separately**, as many times as you like, click any of **"Open ChatGPT" / "Open Claude" / "Open Gemini" / "Open Perplexity" / "Open Custom"** — each opens a new tab with that site and tries to auto-paste the saved text into it. Comment collection isn't repeated — you can open all five LLMs in a row from a single Copy.
8. If auto-paste didn't work, paste manually (Ctrl+V) — the text is already in the clipboard.

Open buttons stay disabled (and Copy shows no checkmark) until a prompt has actually been collected for the video currently on screen — navigating to a different video without pressing Copy again re-disables them, so an Open click can never send a different video's stale prompt.

## Comment source: DOM scraping

DOM scraping of the YouTube page was chosen over the YouTube Data API because:

- no API key, OAuth, or quota needed;
- works right after install, with zero setup;
- the MVP doesn't need 100% comment completeness — only what's reachable without extra user actions.

Scrolling loads the comment feed in batches; if **Include replies** is enabled, the extension also clicks the "Show replies" buttons before collecting text. If the option is disabled, replies simply never get expanded and never enter the pool — no extra filtering needed.

## Settings (chrome.storage.local)

| Setting | Where to change | Description |
|---|---|---|
| `minChars` | popup / options | minimum comment length in characters |
| `minWords` | options | minimum word count |
| `maxComments` | popup / options | maximum number of selected comments |
| `maxTotalChars` | options | maximum total character volume of comments |
| `includeReplies` | popup / options | whether to collect replies to comments |
| `customLLMUrl` | popup / options | URL for the "Open Custom" button |
| `uiLanguage` | options | interface language (popup, options, buttons/statuses on the YouTube page) and prompt language: `ru` / `en` / `de` |
| `promptTemplate` | options | editable instruction text for the LLM (placeholders `{{videoTitle}}`, `{{videoUrl}}`, `{{count}}`); the comment list is appended after it automatically. Switching language auto-switches to that language's default template only if the prompt hasn't been customized yet — otherwise custom text is left untouched |
| `lastPromptText` | internal | the last collected text, used by all Open buttons |
| `lastPromptVideoId` | internal | the video id the last collected text belongs to, used to gate the Open buttons |

## Architecture

```
manifest.json
background/service-worker.js   — opens the LLM tab, waits for it to load, sends it the text for auto-paste; status icon + comment-count badge
content/youtube.js             — injects Copy + Open×5 buttons, orchestrates collect → filter → build → copy
content/autopaste.js           — experimental: pastes text into the ChatGPT/Claude/Gemini/Perplexity input field
popup/popup.html, popup.js     — settings + Copy button + Open buttons for each LLM
options/options.html, options.js — full settings set
core/commentCollector.js       — scrolls the page, expands replies, collects raw text
core/filter.js                 — local heuristic filter + deduplication + limits
core/promptBuilder.js          — assembles the final text for the LLM
core/i18n.js                   — UI string and prompt template dictionary for ru/en/de, t(lang, key) function
core/clipboard.js              — writes to the clipboard via the offscreen document (fallback: navigator.clipboard / execCommand)
offscreen/offscreen.html, offscreen.js — offscreen document: writes to the clipboard without requiring tab focus / a user gesture (see the "clipboardWrite" manifest permission)
core/targets.js                — preset LLM chat URLs
core/storage.js                — wrapper over chrome.storage.local with defaults + last-text/video storage
core/openTarget.js             — shared "open an LLM with the last text" action, used by both the popup and the content script
```

`core/*` modules are loaded as plain classic scripts (no build/bundler — matches the "maximum simplicity" principle) and share a global scope within whichever context they're injected into (content script, or popup/options).

## Installing as an unpacked extension

1. Open `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the folder containing this extension (where `manifest.json` lives).
5. Open any YouTube video — **"Copy"** and the **"Open ..."** buttons will appear next to the like button, or open the extension's popup via its toolbar icon.

**After any change to `manifest.json`** (e.g. adding a new domain to `host_permissions`), click **Reload** for the extension on `chrome://extensions` — otherwise new domains/content scripts won't be picked up.

## MVP limitations

- YouTube's DOM selectors may change — if the "Copy" button stops collecting comments, the `ytd-comments` structure has likely changed and the selectors in `core/commentCollector.js` need updating.
- Collection doesn't guarantee 100% of a video's comments — only what scrolling manages to load within a reasonable number of iterations.
- Auto-pasting text into the LLM chat isn't a core guarantee — it's implemented as an **experimental bonus** (`content/autopaste.js`) for ChatGPT/Claude/Gemini/Perplexity: after the tab opens and finishes loading, the extension tries to find the input field and paste the text into it. If the site's selectors change and pasting fails, that's not considered a pipeline error — the text is already in the clipboard and can be pasted manually (Ctrl+V). For Custom URL, no auto-paste is attempted — only copy and tab-open.
- The language of the buttons on the YouTube page is fixed at the moment they're created (on load/navigation to a video). If you change the language in options while a YouTube tab is already open, the page's buttons only update after that tab is reloaded — the popup updates immediately every time it's opened.
