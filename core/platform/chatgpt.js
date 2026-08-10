/**
 * FocusAI - Platform Detection Module
 * Specifically checks if a given URL belongs to ChatGPT.
 */

self.FocusAI = self.FocusAI || {};

self.FocusAI.Platform = {
  /**
   * Determines whether a URL is a valid ChatGPT URL.
   * @param {string} url - The URL to check.
   * @returns {boolean} True if the URL belongs to ChatGPT, false otherwise.
   */
  isChatGPTUrl: function(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === 'chatgpt.com' ||
        parsed.hostname.endsWith('.chatgpt.com') ||
        parsed.hostname === 'chat.openai.com' ||
        parsed.hostname.endsWith('.chat.openai.com')
      );
    } catch (e) {
      // In case URL parsing fails, fallback to simple string inclusions or return false
      return url.includes('chatgpt.com') || url.includes('chat.openai.com');
    }
  }
};
