document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('status-indicator');
  const focusToggle = document.getElementById('focus-toggle');
  const focusStateText = document.getElementById('focus-state-text');

  const types = self.FocusAI && self.FocusAI.Messaging && self.FocusAI.Messaging.Types;
  if (!types) {
    console.error('FocusAI Messaging types not found in popup.js');
    return;
  }

  // 1. Check Platform Status using service worker GET_PLATFORM_STATUS message
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: types.GET_PLATFORM_STATUS }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error querying platform status:', chrome.runtime.lastError.message);
        // Fallback or safe handle
        statusIndicator.className = 'status-value not-detected';
        statusIndicator.innerHTML = '<span class="status-dot">○</span> Not detected';
        return;
      }

      if (response && response.success && response.data) {
        if (response.data.isChatGPT) {
          statusIndicator.className = 'status-value detected';
          statusIndicator.innerHTML = '<span class="status-dot">●</span> Detected';
        } else {
          statusIndicator.className = 'status-value not-detected';
          statusIndicator.innerHTML = '<span class="status-dot">○</span> Not detected';
        }
      }
    });

    // 2. Query focus state using service worker GET_FOCUS_STATE message
    chrome.runtime.sendMessage({ type: types.GET_FOCUS_STATE }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error querying focus state:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success && response.data) {
        const enabled = !!response.data.enabled;
        focusToggle.checked = enabled;
        updateFocusUIState(enabled);
      }
    });

    // 3. Listen for changes on the toggle checkbox to set focus state
    focusToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      chrome.runtime.sendMessage({
        type: types.SET_FOCUS_STATE,
        payload: { enabled: enabled }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error setting focus state:', chrome.runtime.lastError.message);
          // Revert checkbox state
          focusToggle.checked = !enabled;
          return;
        }

        if (response && response.success && response.data) {
          updateFocusUIState(!!response.data.enabled);
        } else {
          // Revert checkbox state on failure
          focusToggle.checked = !enabled;
          console.error('Failed to update focus state in storage:', response ? response.error : 'Unknown error');
        }
      });
    });

    // A PING/PONG communication verification on load just to be absolutely sure
    chrome.runtime.sendMessage({ type: types.PING }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[FocusAI-Popup] SW PING failed:', chrome.runtime.lastError.message);
      } else {
        console.log('[FocusAI-Popup] SW PING successful. SW says:', response);
      }
    });

  } else {
    console.error('chrome.runtime API is unavailable in this context.');
  }

  // Helper function to update Focus UI labels cleanly
  function updateFocusUIState(enabled) {
    if (enabled) {
      focusStateText.className = 'status-value active';
      focusStateText.textContent = 'Active';
    } else {
      focusStateText.className = 'status-value inactive';
      focusStateText.textContent = 'Inactive';
    }
  }
});
