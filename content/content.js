/**
 * FocusAI - Content Script
 * Establishes communication with Service Worker, listens for focus state changes,
 * and executes startup handshake.
 *
 * IMPORTANT: Focus Mode styling or ChatGPT DOM manipulation is NOT implemented
 * in this phase. The DOM must remain completely unaltered.
 */

(function() {
  console.log('FocusAI content script loaded');

  // Basic startup handshake (Test 6 / Content Script requirement)
  // Sends PING to service worker to verify communication is active and working.
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: "PING" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[FocusAI] Handshake failed or service worker inactive:', chrome.runtime.lastError.message);
      } else {
        console.log('[FocusAI] Handshake success. Service worker responded:', response);
      }
    });

    // Listen for state synchronization messages from the service worker
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === "FOCUS_STATE_CHANGED") {
        console.log('[FocusAI] Received FOCUS_STATE_CHANGED event. New state enabled:', message.payload ? message.payload.enabled : false);

        // Acknowledge receipt
        sendResponse({
          success: true,
          message: "Acknowledge FOCUS_STATE_CHANGED"
        });
      }
      // Return true to support potential asynchronous handling in the future
      return true;
    });
  } else {
    console.warn('[FocusAI] chrome.runtime messaging API is not available in this context.');
  }
})();
