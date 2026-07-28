// Predefined LLM chat destinations.

// `custom` intentionally carries no url — its destination comes from the
// customLLMUrl setting at click time, via resolveTargetUrl below.
const LLM_TARGETS = {
  chatgpt: { label: 'ChatGPT', url: 'https://chat.openai.com/' },
  claude: { label: 'Claude', url: 'https://claude.ai/new' },
  gemini: { label: 'Gemini', url: 'https://gemini.google.com/app' },
  perplexity: { label: 'Perplexity', url: 'https://www.perplexity.ai/' },
  custom: { label: 'Custom' },
};

function resolveTargetUrl(targetKey, customUrl) {
  if (targetKey === 'custom') {
    return customUrl && customUrl.trim() ? customUrl.trim() : null;
  }
  return LLM_TARGETS[targetKey]?.url ?? null;
}
