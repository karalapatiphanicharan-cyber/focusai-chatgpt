/**
 * FocusAI - Content Script
 * Establishes communication with Service Worker, listens for focus state changes,
 * and executes safe ChatGPT UI discovery & element classification.
 *
 * IMPORTANT: This remains strictly read-only in Phase -2.
 * The DOM must remain completely unaltered.
 */

(function() {
  console.log('FocusAI content script loaded');
  console.log('self.FocusAI exists:', !!self.FocusAI);
  if (self.FocusAI) {
    console.log('self.FocusAI keys:', Object.keys(self.FocusAI));
    if (self.FocusAI.FocusEngine) {
      console.log('FocusEngine keys:', Object.keys(self.FocusAI.FocusEngine));
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
    chrome.runtime.sendMessage({ type: "PING" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[FocusAI] Handshake failed or service worker inactive:', chrome.runtime.lastError.message);
      } else {
        console.log('[FocusAI] Handshake success. Service worker responded:', response);
      }
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
        } else if (message && message.type === "DISCOVER_UI") {
          console.log('[FocusAI] On-demand DISCOVER_UI request received');
          if (self.FocusAI && self.FocusAI.FocusEngine && self.FocusAI.FocusEngine.discoverElements) {
            const report = self.FocusAI.FocusEngine.discoverElements();
            printDiscoveryReport(report);
            sendResponse({
              success: true,
              report: report
            });
          } else {
            sendResponse({
              success: false,
              error: "FocusEngine discovery system is not loaded."
            });
          }
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
      chrome.runtime.sendMessage({ type: types.GET_FOCUS_STATE }, (response) => {
        if (!chrome.runtime.lastError && response && response.success && response.data) {
          if (response.data.enabled === true) {
            console.log('[FocusAI] Persistent Focus State is ON. Restoring Focus Mode on startup...');
            setTimeout(() => {
              if (self.FocusAI && self.FocusAI.FocusEngine && self.FocusAI.FocusEngine.enableFocusMode) {
                self.FocusAI.FocusEngine.enableFocusMode();
              }
            }, 1000); // 1-second grace period for full element rendering
          }
        }
      });
    }

    // -------------------------------------------------------------------------
    // USAGE TRACKING HEARTBEAT (PHASE -4)
    // -------------------------------------------------------------------------
    let heartbeatInterval = null;

    function sendHeartbeat() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: "USAGE_HEARTBEAT"
        }, (response) => {
          if (chrome.runtime.lastError) {
            // Ignore background worker sleep/closed channel error
          }
        });
      }
    }

    function startHeartbeat() {
      if (heartbeatInterval) return;
      sendHeartbeat();
      heartbeatInterval = setInterval(sendHeartbeat, 1000); // 1-second interval
    }

    function stopHeartbeat() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }

    function checkVisibilityAndReport() {
      if (document.visibilityState === 'visible') {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    }

    // Register active/visibility state listeners
    document.addEventListener('visibilitychange', checkVisibilityAndReport);
    window.addEventListener('focus', checkVisibilityAndReport);
    window.addEventListener('blur', checkVisibilityAndReport);

    // Initial check
    checkVisibilityAndReport();

    // -------------------------------------------------------------------------
    // USER PROMPT SUBMISSION DETECTION (PHASE -4)
    // -------------------------------------------------------------------------
    let userSubmittedPrompt = false;
    let submitTimeout = null;

    // Intent detectors for user submits
    document.addEventListener('click', (e) => {
      const sendBtn = e.target.closest('button[data-testid*="send-button"], button[aria-label*="Send"], [class*="send"]');
      if (sendBtn) {
        userSubmittedPrompt = true;
        if (submitTimeout) clearTimeout(submitTimeout);
        submitTimeout = setTimeout(() => { userSubmittedPrompt = false; }, 8000);
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const textarea = e.target.closest('#prompt-textarea, textarea');
        if (textarea) {
          userSubmittedPrompt = true;
          if (submitTimeout) clearTimeout(submitTimeout);
          submitTimeout = setTimeout(() => { userSubmittedPrompt = false; }, 8000);
        }
      }
    }, true);

    function scanAndMarkUserMessages() {
      const userMessages = document.querySelectorAll(
        'article[data-role="user"], article[data-testid*="user-message"], [data-role="user"]'
      );
      userMessages.forEach(el => {
        if (!el.getAttribute('data-focusai-processed')) {
          el.setAttribute('data-focusai-processed', 'true');
          if (userSubmittedPrompt) {
            // Newly submitted prompt confirmed!
            userSubmittedPrompt = false;
            if (submitTimeout) clearTimeout(submitTimeout);
            reportNewUserPrompt();
          }
        }
      });
    }

    function reportNewUserPrompt() {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: "INCREMENT_PROMPT"
        }, (response) => {
          if (chrome.runtime.lastError) {
            // Ignore channel errors
          }
        });
      }
    }

    // Initial mark of any current historical user messages
    scanAndMarkUserMessages();

    // Set up MutationObserver to capture user prompt additions dynamically
    const promptObserver = new MutationObserver(() => {
      scanAndMarkUserMessages();
    });
    promptObserver.observe(document.body, { childList: true, subtree: true });

    // Detect chat/URL navigations to refresh initial markings cleanly
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        scanAndMarkUserMessages();
      }
    }, 500);

  } else {
    console.warn('[FocusAI] chrome.runtime messaging API is not available in this context.');
  }
})();
