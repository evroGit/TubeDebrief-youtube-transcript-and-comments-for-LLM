// EXPERIMENTAL bonus feature, not part of the core guarantee: tries to paste
// the text that was already copied to the clipboard into the chat input of
// ChatGPT / Claude / Gemini once the tab we opened finishes loading.
// If this fails for any reason, the text is still in the clipboard and the
// user can paste it manually — that's the one guarantee that always holds.

const SELECTORS_BY_HOST = {
  'chat.openai.com': ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea'],
  'chatgpt.com': ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea'],
  'claude.ai': ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"]'],
  'gemini.google.com': ['div.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]', 'textarea'],
  'www.perplexity.ai': ['textarea[placeholder]', 'div[contenteditable="true"]', 'textarea'],
};

function findInputElement() {
  const selectors = SELECTORS_BY_HOST[location.hostname] || ['div[contenteditable="true"]', 'textarea'];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function waitForInputElement(timeoutMs = 15000) {
  return new Promise((resolve) => {
    const existing = findInputElement();
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = findInputElement();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(findInputElement());
    }, timeoutMs);
  });
}

// Every insert path below has to replace what is in the field, not add to it —
// see the listener comment for why this script can be asked to paste twice.
// execCommand('insertText') inserts at the caret, so without selecting the
// existing contents first a second insert appends a second copy of the prompt.
function selectExistingContent(el) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    el.select();
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Editors of the ProseMirror/Quill/Lexical family implement paste themselves,
// and the prompt is in the clipboard already — so this is both the closest thing
// to what the user would do by hand and the only route that goes through the
// editor's own insertion pipeline exactly once. An editor that takes it calls
// preventDefault; a synthetic event performs no default action of its own, so
// "not prevented" means nobody handled it and the routes below still apply.
function pasteViaClipboardEvent(el, text) {
  if (typeof DataTransfer !== 'function' || typeof ClipboardEvent !== 'function') return false;

  const data = new DataTransfer();
  data.setData('text/plain', text);
  const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event.defaultPrevented;
}

// Returns which route did the insert, for the console line in the listener.
async function insertTextIntoElement(el, text) {
  el.focus();
  selectExistingContent(el);

  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'value-setter';
  }

  if (pasteViaClipboardEvent(el, text)) return 'paste-event';

  // contenteditable: execCommand notifies React/ProseMirror-style editors of the
  // change, unlike directly mutating textContent.
  //
  // Nothing is written after execCommand reports success, however empty the
  // field looks: an editor that handles beforeinput itself applies the insertion
  // on its own schedule, so reading the field straight away says nothing about
  // whether the insert took. Checking it synchronously and "repairing" it is
  // exactly what put the prompt in twice, back to back — our own copy, then the
  // editor's pending one landing on top. Recovering a genuinely failed insert is
  // worth less than never double-pasting: the clipboard is the guarantee here,
  // this is only the convenience.
  if (document.execCommand('insertText', false, text)) return 'exec-command';

  // execCommand explicitly refused, so nothing was inserted by anyone and there
  // is nothing to collide with. A plain input event, though — an InputEvent
  // carrying data/inputType "insertText" invites the editor to apply the same
  // text a second time, on top of what was just written.
  el.textContent = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'text-content';
}

// The worker retries paste-text until it gets a positive response, and it cannot
// tell "the content script never received it" from "the answer never came back"
// — the port closes whenever the SPA navigates or the service worker is torn
// down while we are still waiting for the chat input to appear. So the same
// prompt does arrive more than once, and each arrival used to insert it again:
// invisible on a textarea, where setting .value replaces the previous insert,
// but on a contenteditable editor the second copy simply landed after the first.
// That is what made this show up on Perplexity and not on the textarea targets.
//
// One insert per text, and one insert at a time: a repeat is answered, not
// pasted, and concurrent arrivals share the single insert already running.
let pasting = null;
let pastedText = null;

function startPaste(text) {
  return waitForInputElement()
    .then(async (el) => {
      if (!el) return { ok: false, reason: 'input-not-found' };
      const route = await insertTextIntoElement(el, text);
      pastedText = text;
      // Which route ran, and into what: this is an experimental convenience over
      // sites that redraw their editors freely, so when it misbehaves the console
      // should already say where to look.
      console.debug('[yt-llm autopaste] inserted via', route, '→', el.tagName.toLowerCase(), el.className || '');
      return { ok: true, route };
    })
    .catch((err) => {
      console.error('[yt-llm autopaste] insert failed', err);
      return { ok: false, reason: 'insert-failed' };
    })
    .finally(() => {
      pasting = null;
    });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'paste-text' || !message.text) return undefined;

  if (pastedText === message.text) {
    sendResponse?.({ ok: true, reason: 'already-pasted' });
    return true;
  }

  // Sharing the in-flight promise rather than answering "busy" keeps the worker's
  // retry budget intact: it waits on this response instead of spending an attempt.
  pasting = pasting || startPaste(message.text);
  pasting.then((result) => sendResponse?.(result));

  return true;
});
