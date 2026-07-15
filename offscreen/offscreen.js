// Offscreen documents exist to dodge the "document must have focus" rule
// that blocks clipboard writes from a regular tab/popup — but in practice
// navigator.clipboard.writeText still throws NotAllowedError here too
// (Chrome doesn't treat an offscreen document as focused for the Clipboard
// API), so it's skipped entirely in favor of execCommand('copy'), which has
// no such focus requirement and is what actually succeeds.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'offscreen-write-clipboard') return undefined;

  writeToClipboard(message.text).then(
    () => sendResponse({ ok: true }),
    (err) => {
      console.error('[yt-llm offscreen] clipboard write failed', err?.name, err?.message);
      sendResponse({ ok: false, reason: err?.message || 'offscreen-write-failed' });
    }
  );
  return true;
});

async function writeToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    if (!document.execCommand('copy')) {
      throw new Error('execCommand("copy") returned false');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
