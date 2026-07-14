// Shared "open an LLM tab with the last copied prompt" action, usable from
// both the popup and the injected page button — decoupled from collection,
// so the user can open several different LLMs from one Copy run.

async function openLLMTarget(targetKey, customUrl) {
  const url = resolveTargetUrl(targetKey, customUrl);
  if (!url) return { ok: false, reason: 'no-url' };

  const text = await getLastPrompt();
  if (!text) return { ok: false, reason: 'no-text' };

  chrome.runtime.sendMessage({ type: 'open-llm-tab', url, text });
  return { ok: true };
}
