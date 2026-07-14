// Clipboard write. Primary path goes through the background's offscreen
// document (see background/service-worker.js), because navigator.clipboard
// and execCommand('copy') both silently fail here when this content script's
// tab isn't the focused document — which is exactly the case when Copy is
// triggered from the popup instead of the on-page button. The offscreen
// document has no such focus requirement.
// Local writeText/execCommand are kept only as a fallback if that path fails.

async function copyTextToClipboard(text) {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'copy-text', text });
    if (response?.ok) return true;
    console.warn('[yt-llm clipboard] offscreen copy failed, falling back to local write', response);
  } catch (err) {
    console.warn('[yt-llm clipboard] could not reach background for offscreen copy, falling back to local write', err);
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('[yt-llm clipboard] navigator.clipboard.writeText failed, falling back to execCommand', err);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
    if (!ok) console.error('[yt-llm clipboard] execCommand("copy") returned false');
  } catch (err) {
    console.error('[yt-llm clipboard] execCommand("copy") threw', err);
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}
