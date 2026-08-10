document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('status-indicator');

  // Query active tab in the current window
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      const url = activeTab.url || '';

      // Check if URL matches chatgpt.com or chat.openai.com
      const isChatGPT = url.includes('chatgpt.com') || url.includes('chat.openai.com');

      if (isChatGPT) {
        statusIndicator.className = 'status-value detected';
        statusIndicator.innerHTML = '<span class="status-dot">●</span> Detected';
      } else {
        statusIndicator.className = 'status-value not-detected';
        statusIndicator.innerHTML = '<span class="status-dot">○</span> Not detected';
      }
    }
  });
});
