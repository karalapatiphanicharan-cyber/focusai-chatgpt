document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('status-indicator');
  const focusToggle = document.getElementById('focus-toggle');
  const focusStateText = document.getElementById('focus-state-text');
  const focusSwitchWrapper = document.getElementById('focus-switch-wrapper');
  const openChatgptContainer = document.getElementById('open-chatgpt-container');
  const openChatgptBtn = document.getElementById('open-chatgpt-btn');

  // New UI selectors for navigation
  const mainView = document.getElementById('main-view');
  const usageView = document.getElementById('usage-view');
  const usageNavLink = document.getElementById('usage-nav-link');
  const usageBackBtn = document.getElementById('usage-back-btn');

  // Usage view metrics selectors
  const usageStartedText = document.getElementById('usage-started-text');
  const usageUsedText = document.getElementById('usage-used-text');
  const usageSessionsText = document.getElementById('usage-sessions-text');
  const usageStatusBadge = document.getElementById('usage-status-badge');

  let usageUpdateInterval = null;

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
        setToggleInteraction(false);
        return;
      }

      if (response && response.success && response.data) {
        const isChatGPT = !!response.data.isChatGPT;
        if (isChatGPT) {
          statusIndicator.className = 'status-value detected';
          statusIndicator.innerHTML = '<span class="status-dot">●</span> Detected';
          setToggleInteraction(true);
        } else {
          statusIndicator.className = 'status-value not-detected';
          statusIndicator.innerHTML = '<span class="status-dot">○</span> Not detected';
          setToggleInteraction(false);
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
      // Extra guard check to ensure no state updates when disabled
      if (focusToggle.disabled) {
        e.preventDefault();
        return;
      }

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

    // 4. Bind "Open ChatGPT" button click handler to open https://chatgpt.com/ in a new tab
    if (openChatgptBtn) {
      openChatgptBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: 'https://chatgpt.com/' });
        } else {
          window.open('https://chatgpt.com/', '_blank');
        }
      });
    }

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

  // ---------------------------------------------------------------------------
  // USAGE VIEW NAVIGATION & LIVE UPDATES (PHASE -4)
  // ---------------------------------------------------------------------------
  if (usageNavLink && mainView && usageView) {
    usageNavLink.addEventListener('click', () => {
      mainView.style.display = 'none';
      usageView.style.display = 'block';
      startUsageLiveUpdates();
    });
  }

  if (usageBackBtn && mainView && usageView) {
    usageBackBtn.addEventListener('click', () => {
      usageView.style.display = 'none';
      mainView.style.display = 'block';
      stopUsageLiveUpdates();
    });
  }

  function startUsageLiveUpdates() {
    updateUsageMetrics();
    if (usageUpdateInterval) clearInterval(usageUpdateInterval);
    usageUpdateInterval = setInterval(updateUsageMetrics, 1000); // Poll once per second
  }

  function stopUsageLiveUpdates() {
    if (usageUpdateInterval) {
      clearInterval(usageUpdateInterval);
      usageUpdateInterval = null;
    }
  }

  function formatLocalTime(timestamp) {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  }

  function formatActiveTime(seconds) {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }

  function updateUsageMetrics() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) return;

    // Request usage data
    chrome.runtime.sendMessage({ type: types.GET_USAGE_DATA }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error fetching usage data:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        usageStartedText.textContent = formatLocalTime(response.startedAt);
        usageUsedText.textContent = formatActiveTime(response.totalActiveSeconds);
        usageSessionsText.textContent = response.sessions || 0;
      }
    });

    // Request active status from trackingSession storage
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('trackingSession', (stored) => {
        const session = stored ? stored.trackingSession : null;
        const isActive = session && (Date.now() - session.lastHeartbeatTime < 4000);
        if (isActive) {
          usageStatusBadge.className = 'status-value active';
          usageStatusBadge.textContent = 'ACTIVE';
        } else {
          usageStatusBadge.className = 'status-value inactive';
          usageStatusBadge.textContent = 'PAUSED';
        }
      });
    }

    // Update next reset calculation
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // local midnight
    const diffMs = midnight - now;
    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    document.getElementById('usage-reset-text').textContent = `${hrs}h ${mins}m`;
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

  // Helper function to enable or disable focus toggle controls cleanly
  function setToggleInteraction(enable) {
    if (enable) {
      focusToggle.disabled = false;
      if (focusSwitchWrapper) {
        focusSwitchWrapper.classList.remove('disabled');
      }
      if (openChatgptContainer) {
        openChatgptContainer.style.display = 'none';
      }
    } else {
      focusToggle.disabled = true;
      if (focusSwitchWrapper) {
        focusSwitchWrapper.classList.add('disabled');
      }
      if (openChatgptContainer) {
        openChatgptContainer.style.display = 'block';
      }
    }
  }
});
