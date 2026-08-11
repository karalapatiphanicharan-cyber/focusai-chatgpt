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

      case types.GET_USAGE_DATA:
        self.FocusAI.UsageTracker.getTodayUsage()
          .then((usage) => {
            sendResponse(usage);
          })
          .catch((err) => {
            sendResponse({ success: false, error: err.message });
          });
        return true;

      case types.INCREMENT_PROMPT:
        self.FocusAI.Storage.get('dailyUsage').then((dailyUsage) => {
          dailyUsage = dailyUsage || {};
          const today = self.FocusAI.UsageTracker.getLocalDateString();
          if (!dailyUsage[today]) {
            dailyUsage[today] = {
              startedAt: null,
              totalScreenTimeSeconds: 0,
              promptCount: 0
            };
          }
          dailyUsage[today].promptCount = (dailyUsage[today].promptCount || 0) + 1;

          self.FocusAI.Storage.set('dailyUsage', dailyUsage).then(() => {
            sendResponse({ success: true, count: dailyUsage[today].promptCount });
          });
        }).catch((err) => {
          console.error('[FocusAI] Error incrementing prompt:', err);
          sendResponse({ success: false });
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

            Promise.all([
              self.FocusAI.Storage.get('dailyUsage'),
              self.FocusAI.Storage.get('trackingSession')
            ]).then(([dailyUsage, trackingSession]) => {
              dailyUsage = dailyUsage || {};
              trackingSession = trackingSession || null;

              const today = self.FocusAI.UsageTracker.getLocalDateString();
              if (!dailyUsage[today]) {
                dailyUsage[today] = {
                  startedAt: null,
                  totalScreenTimeSeconds: 0,
                  promptCount: 0
                };
              }

              const now = Date.now();
              const record = dailyUsage[today];

              // Record first startedAt time of today
              if (record.startedAt === null) {
                record.startedAt = now;
              }

              if (!trackingSession) {
                // Brand new screen time session started!
                trackingSession = {
                  activeTabId: currentTabId,
                  lastHeartbeatTime: now,
                  sessionStartTime: now,
                  paused: false,
                  pausedAt: null
                };
              } else {
                if (trackingSession.paused) {
                  // Resume session cleanly
                  const pauseDuration = now - trackingSession.pausedAt;
                  if (pauseDuration > 10000) {
                    trackingSession.sessionStartTime = now;
                  }
                  trackingSession.paused = false;
                  trackingSession.pausedAt = null;
                  trackingSession.lastHeartbeatTime = now;
                  trackingSession.activeTabId = currentTabId;
                } else {
                  // Switched between ChatGPT Tab A and ChatGPT Tab B
                  if (trackingSession.activeTabId !== currentTabId) {
                    trackingSession.activeTabId = currentTabId;
                  }

                  const elapsedMs = now - trackingSession.lastHeartbeatTime;
                  const sessionDelta = Math.floor(elapsedMs / 1000);

                  if (sessionDelta > 0) {
                    const cappedDelta = Math.min(5, sessionDelta);
                    record.totalScreenTimeSeconds += cappedDelta;
                    // Preserve fractional milliseconds precisely to completely solve quantization error!
                    trackingSession.lastHeartbeatTime = trackingSession.lastHeartbeatTime + (sessionDelta * 1000);
                  }
                }
              }

              Promise.all([
                self.FocusAI.Storage.set('dailyUsage', dailyUsage),
                self.FocusAI.Storage.set('trackingSession', trackingSession)
              ]).then(() => {
                sendResponse({ success: true, active: true });
              });
            }).catch((err) => {
              console.error('[FocusAI] Heartbeat tracking error:', err);
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

  // Keep message channel open for asynchronous responses where applicable
  return true;
});

// Finalize and pause current session safely
function pauseCurrentSession() {
  Promise.all([
    self.FocusAI.Storage.get('dailyUsage'),
    self.FocusAI.Storage.get('trackingSession')
  ]).then(([dailyUsage, trackingSession]) => {
    if (!trackingSession || trackingSession.paused) return;

    const now = Date.now();
    const elapsedMs = now - trackingSession.lastHeartbeatTime;
    const elapsedSec = Math.floor(elapsedMs / 1000);

    dailyUsage = dailyUsage || {};
    const today = self.FocusAI.UsageTracker.getLocalDateString();
    if (dailyUsage[today]) {
      if (elapsedSec > 0 && elapsedSec <= 10) {
        dailyUsage[today].totalScreenTimeSeconds += elapsedSec;
      }
    }

    trackingSession.paused = true;
    trackingSession.pausedAt = now;
    trackingSession.lastHeartbeatTime = now;

    Promise.all([
      self.FocusAI.Storage.set('trackingSession', trackingSession),
      self.FocusAI.Storage.set('dailyUsage', dailyUsage)
    ]);
  }).catch((err) => {
    console.error('[FocusAI] Error pausing session:', err);
  });
}

// Clean up active session state when windows focus out or active tabs switch
function handleActiveStateChange() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
      pauseCurrentSession();
      return;
    }
    const activeTab = tabs[0];
    const url = activeTab.url || "";

    // If focus shifted to popup window, pause accumulation but preserve session!
    if (url.startsWith('chrome-extension://')) {
      pauseCurrentSession();
      return;
    }

    const isChatGPT = self.FocusAI.Platform.isChatGPTUrl(url);
    if (!isChatGPT) {
      pauseCurrentSession();
    }
  });
}

chrome.tabs.onActivated.addListener(handleActiveStateChange);
chrome.tabs.onRemoved.addListener(handleActiveStateChange);
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    pauseCurrentSession();
  } else {
    handleActiveStateChange();
  }
});
