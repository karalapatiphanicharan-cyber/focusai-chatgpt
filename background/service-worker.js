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
        if (chrome.runtime.lastError) {
          console.debug(`Safe ignored broadcast error for tab ${tab.id}: ${chrome.runtime.lastError.message}`);
        } else {
          console.log(`Successfully notified tab ${tab.id} of focus state change:`, response);
        }
      });
    });
  });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const types = self.FocusAI.Messaging.Types;

  if (!message || !message.type) {
    sendResponse({
      success: false,
      error: "Message is empty or missing 'type' property."
    });
    return true;
  }

  try {
    switch (message.type) {
      case types.PING:
        sendResponse({
          success: true,
          type: types.PONG
        });
        break;

      case types.GET_PLATFORM_STATUS:
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

      case types.GET_USAGE_DATA:
        self.FocusAI.UsageTracker.getWeeklyStarts()
          .then((weeklyStarts) => {
            sendResponse({ success: true, data: weeklyStarts });
          })
          .catch((err) => {
            sendResponse({ success: false, error: err.message });
          });
        return true;

      case types.USAGE_HEARTBEAT:
        const currentTabId = sender.tab ? sender.tab.id : null;
        if (!currentTabId) {
          sendResponse({ success: false });
          break;
        }

        // Authoritative browser active/focused checking to have 100% precise accounting
        chrome.tabs.get(currentTabId, (tab) => {
          if (chrome.runtime.lastError || !tab || !tab.active) {
            sendResponse({ success: false });
            return;
          }

          chrome.windows.get(tab.windowId, (win) => {
            if (chrome.runtime.lastError || !win || !win.focused) {
              sendResponse({ success: false });
              return;
            }

            // Only record daily starts on actual ChatGPT activation
            self.FocusAI.UsageTracker.recordFirstOpenToday()
              .then((startedAt) => {
                sendResponse({ success: true, startedAt: startedAt });
              })
              .catch((err) => {
                console.error('[FocusAI] Error recording daily startedAt:', err);
                sendResponse({ success: false });
              });
          });
        });
        return true;

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

  return true;
});

// Clean up active session state when windows focus out or active tabs switch
function handleActiveStateChange() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
      return;
    }
    const activeTab = tabs[0];
    const url = activeTab.url || "";

    if (url.startsWith('chrome-extension://')) {
      return;
    }

    const isChatGPT = self.FocusAI.Platform.isChatGPTUrl(url);
    if (isChatGPT) {
      // Record today's first-open immediately when ChatGPT tab is activated
      self.FocusAI.UsageTracker.recordFirstOpenToday();
    }
  });
}

chrome.tabs.onActivated.addListener(handleActiveStateChange);
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    handleActiveStateChange();
  }
});
