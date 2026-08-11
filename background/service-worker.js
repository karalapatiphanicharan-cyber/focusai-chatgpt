/**
 * FocusAI - Service Worker
 * Coordinates extension-level messaging, storage access, and feature coordination.
 */

// Load core architectural modules using importScripts
importScripts(
  '../core/messaging/messages.js',
  '../core/platform/chatgpt.js',
  '../core/storage/storage.js',
  '../core/focus/focus-engine.js',
  '../core/usage/usage-tracker.js'
);

console.log('FocusAI service worker started');

// Helper function to broadcast state change to active ChatGPT tabs
function broadcastFocusStateChange(enabled) {
  // Query all tabs and attempt message sending to every tab.
  // This completely bypasses MV3 tab.url undefined limitations under activeTab permission restrictions,
  // while ensuring any inactive mock tabs in testing also receive the state change correctly.
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs during broadcast:', chrome.runtime.lastError.message);
      return;
    }
    const types = self.FocusAI.Messaging.Types;
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: types.FOCUS_STATE_CHANGED,
        payload: { enabled: enabled }
      }, (response) => {
        // Safe check for runtime errors (e.g. if the tab is not a ChatGPT tab or has no content script)
        if (chrome.runtime.lastError) {
          console.debug(`Safe ignored broadcast error for tab ${tab.id}: ${chrome.runtime.lastError.message}`);
        } else {
          console.log(`Successfully notified tab ${tab.id} of focus state change:`, response);
        }
      });
    });
  });
}

// Listen for messages from popup or content scripts to handle the message contracts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const types = self.FocusAI.Messaging.Types;

  if (!message || !message.type) {
    sendResponse({
      success: false,
      error: "Message is empty or missing 'type' property."
    });
    return true;
  }

  // Handle messages safely
  try {
    switch (message.type) {
      case types.PING:
        sendResponse({
          success: true,
          type: types.PONG
        });
        break;

      case types.GET_PLATFORM_STATUS:
        // Get the active tab in the last focused window to evaluate status
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              type: types.PLATFORM_STATUS,
              error: chrome.runtime.lastError.message
            });
            return;
          }
          const activeTab = tabs && tabs.length > 0 ? tabs[0] : null;
          const url = activeTab ? activeTab.url : '';
          sendResponse({
            success: true,
            type: types.PLATFORM_STATUS,
            data: {
              isChatGPT: self.FocusAI.Platform.isChatGPTUrl(url)
            }
          });
        });
        return true;

      case types.GET_FOCUS_STATE:
        self.FocusAI.Storage.get('focusEnabled')
          .then((storedVal) => {
            const enabled = storedVal !== null ? !!storedVal : false;
            sendResponse({
              success: true,
              type: types.FOCUS_STATE,
              data: {
                enabled: enabled
              }
            });
          })
          .catch((err) => {
            console.error('Error retrieving focus state from storage:', err);
            sendResponse({
              success: false,
              error: err.message || "Failed to retrieve focus state."
            });
          });
        return true;

      case types.SET_FOCUS_STATE:
        if (!message.payload || typeof message.payload.enabled !== 'boolean') {
          sendResponse({
            success: false,
            error: "Invalid payload: 'payload.enabled' must be a boolean."
          });
          break;
        }

        const newEnabled = message.payload.enabled;
        self.FocusAI.Storage.set('focusEnabled', newEnabled)
          .then(() => {
            // Broadcast state change to all active ChatGPT tabs
            broadcastFocusStateChange(newEnabled);

            sendResponse({
              success: true,
              type: types.FOCUS_STATE,
              data: {
                enabled: newEnabled
              }
            });
          })
          .catch((err) => {
            console.error('Error storing focus state:', err);
            sendResponse({
              success: false,
              error: err.message || "Failed to store focus state."
            });
          });
        return true;

      case types.GET_SETTINGS:
      case types.SET_SETTINGS:
        sendResponse({
          success: false,
          error: "Settings management is not implemented in Phase -3."
        });
        break;

      default:
        sendResponse({
          success: false,
          error: "Unrecognized or unhandled message type: " + message.type
        });
        break;
    }
  } catch (err) {
    console.error('Unexpected error in service worker message listener:', err);
    sendResponse({
      success: false,
      error: err.message || "Unexpected internal error."
    });
  }

  // Keep message channel open for asynchronous responses where applicable
  return true;
});
