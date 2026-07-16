// Shared "open an LLM tab with the last copied prompt" action, usable from
// both the popup and the injected page button — decoupled from collection,
// so the user can open several different LLMs from one Copy run.
//
// `currentVideoUrl` (the video the button was clicked under) is compared
// against the video the stored prompt was actually collected for, so
// navigating to a different video without pressing Copy again can't send
// that video's stale prompt to the LLM.
async function openLLMTarget(targetKey, customUrl, currentVideoUrl) {
  const url = resolveTargetUrl(targetKey, customUrl);
  if (!url) return { ok: false, reason: 'no-url' };

  const text = await getLastPrompt();
  if (!text) return { ok: false, reason: 'no-text' };

  if (currentVideoUrl) {
    const storedVideoId = await getLastPromptVideoId();
    const currentVideoId = extractVideoId(currentVideoUrl);
    if (storedVideoId && currentVideoId && storedVideoId !== currentVideoId) {
      return { ok: false, reason: 'stale-video' };
    }
  }

  chrome.runtime.sendMessage({ type: 'open-llm-tab', url, text });
  return { ok: true };
}
