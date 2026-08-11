/**
 * FocusAI - Content Script
 * Establishes communication with Service Worker, listens for focus state changes,
 * and executes safe ChatGPT UI discovery & element classification.
 */

(function() {
  console.log('FocusAI content script loaded');
  console.log('self.FocusAI exists:', !!self.FocusAI);

  // -------------------------------------------------------------------------
  // SAFE MESSAGING LAYERS & LIFECYCLE (PHASE -4 HOTFIX)
  // -------------------------------------------------------------------------
  let isContextInvalidated = false;

  function cleanupOldContentScript() {
    if (isContextInvalidated) return;
    isContextInvalidated = true;

    console.log('[FocusAI] Extension context invalidated; stopping old content-script communication.');
  }

  function safeSendMessage(message, callback) {
    if (isContextInvalidated) return false;

    try {
      if (
        typeof chrome === "undefined" ||
        !chrome.runtime ||
        typeof chrome.runtime.sendMessage !== "function"
      ) {
        cleanupOldContentScript();
        return false;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message || "";
          if (err.includes("context invalidated") || err.includes("Extension context invalidated")) {
            cleanupOldContentScript();
          }
          return;
        }

        if (callback) {
          try {
            callback(response);
          } catch (cbErr) {
            console.warn('[FocusAI] Callback error:', cbErr);
          }
        }
      });

      return true;

    } catch (error) {
      if (
        error &&
        typeof error.message === "string" &&
        (error.message.includes("context invalidated") || error.message.includes("Extension context invalidated"))
      ) {
        cleanupOldContentScript();
        return false;
      }

      console.warn("[FocusAI] Runtime messaging failed:", error);
      return false;
    }
  }

  // Helper function to format and print the specified development console report
  function printDiscoveryReport(report) {
    if (!report) return;

    console.log("========================================");
    console.log("FocusAI — ChatGPT DOM Discovery");
    console.log("========================================");

    // 1. Sidebar
    console.log("\nSIDEBAR");
    if (report.sidebar && report.sidebar.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.sidebar.confidence.toFixed(2)}`);
      console.log("Protected: NO");
      console.log("Future action: HIDE CANDIDATE");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: NO");
    }

    // 2. Header
    console.log("\nHEADER");
    if (report.header && report.header.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.header.confidence.toFixed(2)}`);
      console.log("Protected: NO");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: NO");
    }

    // 3. Header Actions
    console.log("\nHEADER ACTIONS");
    if (report.headerActions && report.headerActions.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.headerActions.confidence.toFixed(2)}`);
      console.log("Protected: NO");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: NO");
    }

    // 4. Conversation
    console.log("\nCONVERSATION");
    if (report.conversation && report.conversation.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.conversation.confidence.toFixed(2)}`);
      console.log("Protected: YES");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: YES");
    }

    // 5. User Messages
    console.log("\nUSER MESSAGES");
    if (report.userMessages && report.userMessages.found) {
      console.log("FOUND");
      console.log("Protected: YES");
    } else {
      console.log("NOT FOUND");
      console.log("Protected: YES");
    }

    // 6. Assistant Responses
    console.log("\nASSISTANT RESPONSES");
    if (report.assistantResponses && report.assistantResponses.found) {
      console.log("FOUND");
      console.log("Protected: YES");
    } else {
      console.log("NOT FOUND");
      console.log("Protected: YES");
    }

    // 7. Message Actions
    console.log("\nMESSAGE ACTIONS");
    if (report.messageActions && report.messageActions.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.messageActions.confidence.toFixed(2)}`);
      console.log("Protected: NO");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: NO");
    }

    // 8. Disclaimer
    console.log("\nDISCLAIMER");
    if (report.disclaimer && report.disclaimer.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.disclaimer.confidence.toFixed(2)}`);
      console.log("Protected: NO");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: NO");
    }

    // 9. Composer
    console.log("\nCOMPOSER");
    if (report.composer && report.composer.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.composer.confidence.toFixed(2)}`);
      console.log("Protected: NO");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: NO");
    }

    // 10. Composer Controls
    console.log("\nCOMPOSER CONTROLS");
    if (report.composerControls && report.composerControls.found) {
      console.log("FOUND");
      console.log(`Confidence: ${report.composerControls.confidence.toFixed(2)}`);
      console.log("Protected: NO");
    } else {
      console.log("NOT FOUND");
      console.log("Confidence: 0.00");
      console.log("Protected: NO");
    }

    console.log("\n========================================");
  }

  // Define discovery runner
  function runStartupDiscovery() {
    try {
      console.log('[FocusAI] Checking self.FocusAI status during startup...');
      if (self.FocusAI && self.FocusAI.FocusEngine && self.FocusAI.FocusEngine.discoverElements) {
        console.log('[FocusAI] Executing startup DOM discovery...');
        const report = self.FocusAI.FocusEngine.discoverElements();
        printDiscoveryReport(report);
      } else {
        console.warn('[FocusAI] discoverElements function not found under self.FocusAI.FocusEngine:', self.FocusAI);
      }
    } catch (e) {
      console.error('[FocusAI] Error during startup discovery:', e);
    }
  }

  // Register event-driven startup checks
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('[FocusAI] DOM ready at load. Running discovery immediately...');
    runStartupDiscovery();
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      console.log('[FocusAI] DOMContentLoaded fired. Running discovery immediately...');
      runStartupDiscovery();
    });
  }

  // Basic startup handshake
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    safeSendMessage({ type: "PING" }, (response) => {
      console.log('[FocusAI] Handshake success. Service worker responded:', response);
    });

    // Listen for state synchronization and discovery requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (message && message.type === "FOCUS_STATE_CHANGED") {
          console.log('[FocusAI] Received FOCUS_STATE_CHANGED event. New state enabled:', message.payload ? message.payload.enabled : false);

          const focusEngine = self.FocusAI && self.FocusAI.FocusEngine;
          if (focusEngine) {
            if (message.payload && message.payload.enabled === true) {
              focusEngine.enableFocusMode();
            } else if (message.payload && message.payload.enabled === false) {
              focusEngine.disableFocusMode();
            }
          }

          sendResponse({
            success: true,
            message: "Acknowledge FOCUS_STATE_CHANGED"
          });
        }
      } catch (e) {
        console.error('[FocusAI] Error handling incoming message:', e);
        sendResponse({ success: false, error: e.message });
      }
      return true;
    });

    // On load, fetch and automatically synchronize focus state if enabled
    const types = self.FocusAI && self.FocusAI.Messaging && self.FocusAI.Messaging.Types;
    if (types) {
      safeSendMessage({ type: types.GET_FOCUS_STATE }, (response) => {
        if (response && response.success && response.data) {
          if (response.data.enabled === true) {
            console.log('[FocusAI] Persistent Focus State is ON. Restoring Focus Mode on startup...');
            setTimeout(() => {
              if (self.FocusAI && self.FocusAI.FocusEngine && self.FocusAI.FocusEngine.enableFocusMode) {
                self.FocusAI.FocusEngine.enableFocusMode();
              }
            }, 1000);
          }
        }
      });
    }

  } else {
    console.warn('[FocusAI] chrome.runtime messaging API is not available in this context.');
  }
})();
