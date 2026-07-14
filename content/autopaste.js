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

function insertTextIntoElement(el, text) {
  el.focus();

  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // contenteditable: execCommand still reliably notifies React/ProseMirror-style
  // editors of the change, unlike directly mutating textContent.
  const inserted = document.execCommand('insertText', false, text);
  if (!inserted || el.textContent.trim() === '') {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
  }
  return true;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'paste-text' || !message.text) return undefined;

  waitForInputElement().then((el) => {
    if (!el) {
      sendResponse?.({ ok: false, reason: 'input-not-found' });
      return;
    }
    try {
      insertTextIntoElement(el, message.text);
      sendResponse?.({ ok: true });
    } catch (err) {
      console.error('[yt-llm autopaste] insert failed', err);
      sendResponse?.({ ok: false, reason: 'insert-failed' });
    }
  });

  return true;
});
