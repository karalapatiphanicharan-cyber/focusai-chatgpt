document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('status-indicator');
  const focusToggle = document.getElementById('focus-toggle');
  const focusStateText = document.getElementById('focus-state-text');
  const focusSwitchWrapper = document.getElementById('focus-switch-wrapper');
  const openChatgptContainer = document.getElementById('open-chatgpt-container');
  const openChatgptBtn = document.getElementById('open-chatgpt-btn');

  // Navigation transitions (Phase 4.1)
  const mainView = document.getElementById('main-view');
  const usageView = document.getElementById('usage-view');
  const usageNavLink = document.getElementById('usage-nav-link');
  const usageBackBtn = document.getElementById('usage-back-btn');
  const weeklyListContainer = document.getElementById('weekly-list-container');
  const usageWeekRange = document.getElementById('usage-week-range');

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
          focusToggle.checked = !enabled;
          return;
        }

        if (response && response.success && response.data) {
          updateFocusUIState(!!response.data.enabled);
        } else {
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
  // USAGE VIEW NAVIGATION & DYNAMIC RENDER (PHASE 4.1)
  // ---------------------------------------------------------------------------
  if (usageNavLink && mainView && usageView) {
    usageNavLink.addEventListener('click', () => {
      mainView.style.display = 'none';
      usageView.style.display = 'block';
      renderUsageView();
    });
  }

  if (usageBackBtn && mainView && usageView) {
    usageBackBtn.addEventListener('click', () => {
      usageView.style.display = 'none';
      mainView.style.display = 'block';
    });
  }

  function formatLocalTime(timestamp) {
    if (!timestamp) return '<span style="color: #52525B;">Not opened</span>';
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  }

  function getLocalDateString(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const r = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  }

  function renderUsageView() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) return;

    chrome.runtime.sendMessage({ type: types.GET_USAGE_DATA }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error fetching usage starts:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success && response.data) {
        const weeklyData = response.data;
        usageWeekRange.textContent = weeklyData.range;

        // Days of week short names
        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const todayStr = getLocalDateString(new Date());

        weeklyListContainer.innerHTML = '';

        weeklyData.days.forEach(day => {
          const row = document.createElement('div');
          const isToday = day.key === todayStr;

          // Apply row level styling inline
          row.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #18181B;
            border: 1px solid ${isToday ? '#6366F1' : '#27272A'};
            border-radius: 6px;
            padding: 10px 12px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          `;

          // Day label column (with TODAY sub-badge if applicable)
          const dayLabelCol = document.createElement('div');
          dayLabelCol.style.cssText = `
            display: flex;
            flex-direction: column;
            line-height: 1.2;
          `;

          const dayLabel = document.createElement('span');
          dayLabel.textContent = dayNames[day.dayIndex];
          dayLabel.style.cssText = `
            font-size: 10px;
            font-weight: 700;
            color: ${isToday ? '#6366F1' : '#A1A1AA'};
            letter-spacing: 0.05em;
          `;
          dayLabelCol.appendChild(dayLabel);

          if (isToday) {
            const todayBadge = document.createElement('span');
            todayBadge.textContent = 'TODAY';
            todayBadge.style.cssText = `
              font-size: 8px;
              font-weight: 700;
              color: #6366F1;
              letter-spacing: 0.02em;
              margin-top: 1px;
            `;
            dayLabelCol.appendChild(todayBadge);
          }

          // First open time column
          const timeCol = document.createElement('span');
          timeCol.innerHTML = formatLocalTime(day.timestamp);
          timeCol.style.cssText = `
            font-size: 12px;
            font-weight: 600;
            color: ${day.timestamp ? '#FAFAFA' : '#52525B'};
          `;

          row.appendChild(dayLabelCol);
          row.appendChild(timeCol);
          weeklyListContainer.appendChild(row);
        });
      }
    });
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
