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

// Listen for messages from popup or content scripts to handle the message contracts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const types = self.FocusAI.Messaging.Types;

  if (!message || !message.type) {
    return;
  }

  switch (message.type) {
    case types.GET_PLATFORM_STATUS:
      const tabUrl = sender.tab ? sender.tab.url : '';
      sendResponse({
        success: true,
        implemented: true,
        isChatGPT: self.FocusAI.Platform.isChatGPTUrl(tabUrl)
      });
      break;

    case types.GET_FOCUS_STATE:
    case types.FOCUS_MODE_ON:
    case types.FOCUS_MODE_OFF:
      sendResponse({
        success: false,
        implemented: false,
        message: "Focus Mode is not implemented yet in Phase -1."
      });
      break;

    case types.GET_USAGE_DATA:
      sendResponse({
        success: false,
        implemented: false,
        message: "Usage tracking is not implemented yet in Phase -1."
      });
      break;

    case types.GET_SETTINGS:
    case types.SET_SETTINGS:
      sendResponse({
        success: false,
        implemented: false,
        message: "Settings are not implemented yet in Phase -1."
      });
      break;

    default:
      sendResponse({
        success: false,
        error: "Unrecognized or unhandled message type: " + message.type
      });
      break;
  }

  // Keep message channel open for asynchronous responses
  return true;
});
