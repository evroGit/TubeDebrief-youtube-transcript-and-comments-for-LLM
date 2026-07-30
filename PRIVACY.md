# Privacy Policy — TubeDebrief

**Last updated: 30 July 2026**

TubeDebrief ("the extension") collects a YouTube video's transcript and comments
into a single prompt and hands that prompt to an LLM chat service you choose.

**The extension has no backend.** It makes no network requests of its own, contains
no analytics, telemetry, tracking or advertising code, and sends nothing to the
developer or to any third party. Everything described below happens inside your
browser.

## What the extension reads

When you press Copy (in the popup or on the video page), the extension reads the
following from the YouTube page you are currently viewing:

- the video title and URL;
- the transcript text and its chapter headings, when the transcript source is enabled;
- the text of comments and their like counts, when the comment source is enabled.

Comment **author names, avatars, channel links and profile data are not read** —
only the comment text itself and the number of likes.

The extension reads page content only on `https://www.youtube.com/watch*` pages,
and only in response to an explicit action by you. It does not read pages in the
background, does not monitor your browsing, and does not track which videos you
visit.

## What is stored, and where

The extension uses `chrome.storage.local`, which stays on your device and is not
synchronised to a Google account. It holds:

- **Your settings** — content source, filter thresholds, limits, interface
  language and the prompt templates you have edited.
- **The most recently built prompt**, together with the video ID it was built
  from. This exists so that "Open in …" can be used more than once without
  re-collecting, and so that a prompt is never reused for a different video. It
  is overwritten on the next Copy.
- **The most recent error message**, so the popup can explain a failure after
  the on-page status text is gone. Only the latest one is kept; no log accumulates.

Nothing else is stored, and none of it ever leaves your device by way of the
extension.

## Where the collected text goes

The prompt you build goes to exactly two places, both at your request:

1. **Your clipboard**, when you press Copy.
2. **The chat service you pick** — ChatGPT, Claude, Gemini, Perplexity or
   DeepSeek — when you press one of the "Open in …" buttons. The extension opens
   that service in a tab and pastes the prompt into its input field.

Once text reaches a chat service, it is governed by **that service's own privacy
policy and terms**, which are outside the extension's control. If that matters
for the material you are processing, review the policy of the service you use
before sending anything to it.

## Permissions

| Permission | Why it is needed |
|---|---|
| `activeTab` | Read the YouTube page you are on when you press Copy. |
| `scripting` | Paste the prompt into the chat service's input field. |
| `storage` | Save your settings and the most recent prompt locally. |
| `clipboardWrite` | Copy the prompt to your clipboard. |
| `offscreen` | Reach the clipboard API from the background worker, which cannot use it directly. |
| Access to `youtube.com` | Collect the transcript and comments. |
| Access to the five chat services | Paste the prompt into the tab that is opened. |

None of these permissions are used for any purpose other than the one listed.

## Data sale and transfer

The extension does not sell, transfer, or share user data with anyone. It is not
used to determine creditworthiness or for lending purposes, and it is not used
for any purpose unrelated to the single function described at the top of this
document.

## Removing your data

Uninstalling the extension deletes everything it has stored. Settings can also
be reset from the options page at any time.

## Changes

Material changes to this policy will be reflected here, with the date at the top
updated accordingly.

## Contact

Questions about this policy: **<CONTACT EMAIL>**
