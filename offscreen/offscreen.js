// Offscreen documents are exempt from the "document must have focus" rule
// that blocks navigator.clipboard.writeText in a regular tab/popup — this is
// what actually fixes the "часто не удаётся скопировать" bug (Copy triggered
// from the popup left the YouTube tab unfocused, so the write silently failed).

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'offscreen-write-clipboard') return undefined;

  navigator.clipboard.writeText(message.text).then(
    () => sendResponse({ ok: true }),
    (err) => {
      console.error('[yt-llm offscreen] clipboard write failed', err);
      sendResponse({ ok: false, reason: err?.message || 'offscreen-write-failed' });
    }
  );
  return true;
});
