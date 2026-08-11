/**
 * FocusAI - Focus Engine Module
 * Interface for controlling Focus Mode state and executing safe ChatGPT UI discovery & classification.
 */

self.FocusAI = self.FocusAI || {};

// Shared state for original inline styling to ensure complete, lossless restoration and absolute idempotency.
// Using a local memory object to store styling since Maps can't be easily serialized, but content scripts persist this in context.
const originalStyles = {};

self.FocusAI.FocusEngine = {
  /**
   * Retrieves the current Focus Mode status.
   * @returns {Object} The default status structure.
   */
  getFocusState: function() {
    return {
      focusEnabled: document.documentElement.getAttribute('data-focusai-active') === 'true',
      implemented: true
    };
  },

  /**
   * Helper to locate the leaf-most (smallest) HTML element containing the visible ChatGPT disclaimer text.
   */
  _findDisclaimerElement: function() {
    if (typeof document === 'undefined') return null;
    const candidates = Array.from(document.querySelectorAll('div, span, p, a, font'));
    const matches = candidates.filter(el => {
      const text = el.textContent || "";
      const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
      return (
        normalized.includes("can make mistakes") ||
        normalized.includes("check important info") ||
        normalized.includes("check response") ||
        normalized.includes("pueden cometer") ||
        normalized.includes("fehler machen") ||
        normalized.includes("peut se tromper")
      );
    });

    const leafMatches = matches.filter(el => {
      const descendants = Array.from(el.querySelectorAll('div, span, p, a, font'));
      const hasMatchingDescendant = descendants.some(desc => {
        const descNormalized = (desc.textContent || "").toLowerCase().replace(/\s+/g, ' ').trim();
        return (
          descNormalized.includes("can make mistakes") ||
          descNormalized.includes("check important info") ||
          descNormalized.includes("pueden cometer") ||
          descNormalized.includes("fehler machen") ||
          descNormalized.includes("peut se tromper")
        );
      });
      return !hasMatchingDescendant;
    });

    return leafMatches[0] || matches[matches.length - 1] || null;
  },

  /**
   * Conservative protected-content check
   */
  isProtected: function(el) {
    if (!el || !(el instanceof HTMLElement)) return true;

    const tagName = el.tagName.toUpperCase();

    // 1. Structural Exclusions: main content root, documents, sections, articles, tables, pre, images, codes
    if (
      tagName === "HTML" ||
      tagName === "BODY" ||
      tagName === "MAIN" ||
      tagName === "ARTICLE" ||
      tagName === "SECTION" ||
      tagName === "PRE" ||
      tagName === "CODE" ||
      tagName === "TABLE" ||
      tagName === "IMG"
    ) {
      return true;
    }

    if (
      el.id === "root" ||
      el.id === "app" ||
      el.classList.contains("main-panel") ||
      el.classList.contains("markdown") ||
      el.classList.contains("prose") ||
      el.classList.contains("react-scroll-to-bottom--css") ||
      el.classList.contains("conversation-container")
    ) {
      return true;
    }

    // 2. Ancestor Check: Do NOT hide if element is an ancestor of the conversation
    const conversationContainer = document.querySelector(
      '.react-scroll-to-bottom--css, .conversation-container, [data-role="user"], [data-role="assistant"], [data-testid*="user-message"], [data-testid*="assistant-message"]'
    );
    if (conversationContainer && el.contains(conversationContainer)) {
      return true;
    }

    // 3. Descendant Check: Do NOT hide if element is nested inside the active conversation
    if (conversationContainer && conversationContainer.contains(el)) {
      return true;
    }

    // 4. Content Check: Do NOT hide if element contains protected content
    const containsProtected = el.querySelector(
      'article, pre, code, article img, .markdown img, .prose img, article table, .markdown table, .prose table, .react-scroll-to-bottom--css, .conversation-container, [data-role="user"], [data-role="assistant"], [data-testid*="user-message"], [data-testid*="assistant-message"]'
    );
    if (containsProtected) {
      return true;
    }

    // 5. Response Action Buttons protections (Copy, Thumbs Up/Down, Regenerate, Share)
    const containsResponseActionButtons = el.querySelector(
      'article button[aria-label*="Copy" i], article button[aria-label*="response" i], article button[aria-label*="Regenerate" i], .message-actions-toolbar, [class*="thumbs"], [aria-label*="Thumbs"]'
    );
    if (containsResponseActionButtons) {
      return true;
    }

    const isResponseButton =
      tagName === 'BUTTON' && (
        el.getAttribute('aria-label')?.match(/Copy|response|Regenerate|Thumbs/i) ||
        el.className.includes('thumbs') ||
        el.closest('.message-actions-toolbar')
      );
    if (isResponseButton) {
      return true;
    }

    // 6. Large Container Safety Rules
    const rect = el.getBoundingClientRect();
    const descendantsCount = el.querySelectorAll('*').length;
    if (descendantsCount > 50) {
      return true;
    }
    if (rect.width > window.innerWidth * 0.4 && rect.height > window.innerHeight * 0.4) {
      return true;
    }

    return false;
  },

  /**
   * Emergency safety mechanism checks if any protected area has been hidden
   */
  _verifyNoSafetyViolation: function() {
    const protectedElements = document.querySelectorAll(
      '.react-scroll-to-bottom--css, .conversation-container, article, pre, code, table, article img'
    );
    for (const el of protectedElements) {
      if (
        el.getAttribute('data-focusai-hidden') === 'true' ||
        el.style.display === 'none' ||
        el.style.visibility === 'hidden'
      ) {
        return false;
      }
    }
    return true;
  },

  /**
   * Enables Focus Mode on the page (Phase -3).
   * Safely hides non-content elements reversibly while keeping the conversation fully visible.
   * @returns {Object} A result structure indicating success/failure.
   */
  enableFocusMode: function() {
    console.log("[FocusAI] FocusEngine: enableFocusMode called");

    try {
      // 1. Idempotency Check: If already active, do nothing
      if (document.documentElement.getAttribute('data-focusai-active') === 'true') {
        console.log("[FocusAI] Focus Mode is already enabled. Skipping...");
        return { success: true, message: "Focus Mode already active." };
      }

      // Mark Focus Mode active on the document element
      document.documentElement.setAttribute('data-focusai-active', 'true');

      // 2. Discover ChatGPT UI elements on the page
      const elements = this.discoverElements();

      // Elements we want to hide if confidently found
      const hideTargets = [
        { data: elements.sidebar, key: "sidebar" },
        { data: elements.header, key: "header" },
        { data: elements.headerActions, key: "headerActions" },
        { data: elements.disclaimer, key: "disclaimer" },
        { data: elements.composer, key: "composer" }
      ];

      const activationStatus = {
        sidebar: "skipped",
        header: "skipped",
        disclaimer: "skipped",
        composer: "skipped"
      };

      hideTargets.forEach(target => {
        const item = target.data;
        // Check confidence threshold (>= 0.70 to handle disclaimer)
        if (item && item.found && item.confidence >= 0.70) {
          // Resolve the actual element from DOM
          const el = this._resolveElementFromSelector(item.selectorUsed, item.category);
          if (el) {
            const success = this._safeHideElement(el, target.key);
            if (success) {
              if (target.key === "sidebar") activationStatus.sidebar = "hidden";
              if (target.key === "header" || target.key === "headerActions") activationStatus.header = "hidden";
              if (target.key === "disclaimer") activationStatus.disclaimer = "hidden";
              if (target.key === "composer") activationStatus.composer = "hidden";
            }
          }
        }
      });

      // 3. Create and inject the floating FocusAI controls in the bottom-right
      this._injectFloatingControls();

      // Print activation log
      console.log(`========================================
FocusAI — Focus Mode Activation
========================================

SAFE HIDE TARGETS:

SIDEBAR
✓ ${activationStatus.sidebar}

HEADER
✓ ${activationStatus.header}

DISCLAIMER
✓ ${activationStatus.disclaimer}

COMPOSER
✓ ${activationStatus.composer}

PROTECTED TARGETS:

CONVERSATION
✓ untouched

USER MESSAGES
✓ untouched

ASSISTANT RESPONSES
✓ untouched

MESSAGE ACTIONS
✓ untouched

CODE
✓ untouched

IMAGES
✓ untouched

TABLES
✓ untouched

========================================`);

      // 4. Emergency Restore Safety Net Check
      const isClean = this._verifyNoSafetyViolation();
      if (!isClean) {
        console.log("[FocusAI] CRITICAL SAFETY VIOLATION");
        this.disableFocusMode();
        return { success: false, error: "Critical safety violation. Reverted Focus Mode." };
      }

      // Secondary pass for late-rendered disclaimer and UI elements to prevent any regressions
      setTimeout(() => {
        if (document.documentElement.getAttribute('data-focusai-active') === 'true') {
          const freshElements = this.discoverElements();
          const lateTargets = [
            { data: freshElements.disclaimer, key: "disclaimer" },
            { data: freshElements.sidebar, key: "sidebar" },
            { data: freshElements.header, key: "header" },
            { data: freshElements.composer, key: "composer" }
          ];
          lateTargets.forEach(target => {
            const item = target.data;
            if (item && item.found && item.confidence >= 0.70) {
              const el = this._resolveElementFromSelector(item.selectorUsed, item.category);
              if (el) {
                this._safeHideElement(el, target.key);
              }
            }
          });
        }
      }, 3000);

      console.log("[FocusAI] Focus Mode successfully enabled!");
      return { success: true, message: "Focus Mode enabled." };
    } catch (e) {
      console.error("[FocusAI] Error enabling Focus Mode:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Disables Focus Mode on the page (Phase -3).
   * Restores all hidden elements back to their exact original visual style.
   * @returns {Object} A result structure indicating success/failure.
   */
  disableFocusMode: function() {
    console.log("[FocusAI] FocusEngine: disableFocusMode called");

    try {
      // 1. Idempotency Check: If already inactive, do nothing
      if (document.documentElement.getAttribute('data-focusai-active') !== 'true') {
        console.log("[FocusAI] Focus Mode is already disabled. Skipping...");
        return { success: true, message: "Focus Mode already inactive." };
      }

      document.documentElement.removeAttribute('data-focusai-active');

      // 2. Query and restore all elements modified by FocusAI
      const modifiedElements = Array.from(document.querySelectorAll('[data-focusai-modified="true"]'));
      modifiedElements.forEach(el => {
        this._safeRestoreElement(el);
      });

      // Also scan originalStyles remaining keys just in case elements are detached or need clean up
      Object.keys(originalStyles).forEach(key => {
        const item = originalStyles[key];
        if (item && item.element && document.body.contains(item.element)) {
          this._safeRestoreElement(item.element);
        }
        delete originalStyles[key];
      });

      // 3. Remove floating controls
      this._removeFloatingControls();

      console.log("[FocusAI] Focus Mode successfully disabled.");
      return { success: true, message: "Focus Mode disabled." };
    } catch (e) {
      console.error("[FocusAI] Error disabling Focus Mode:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Safe, reversible element hider with strict content protection
   */
  _safeHideElement: function(el, key) {
    if (!el || !(el instanceof HTMLElement)) return false;

    // Check if we already have this element stored
    if (el.getAttribute('data-focusai-modified') === 'true') {
      return false;
    }

    const category = key ? key.toUpperCase() : "UNKNOWN";
    const tag = el.tagName;
    const className = el.className || "None";
    const id = el.id || "None";
    const role = el.getAttribute('role') || "N/A";
    const textPreview = el.textContent ? el.textContent.substring(0, 60).replace(/\s+/g, ' ').trim() : "N/A";
    const parent = el.parentElement ? (el.parentElement.tagName + (el.parentElement.id ? '#' + el.parentElement.id : '')) : "N/A";

    const containsConversation = !!(el.querySelector('.react-scroll-to-bottom--css, .conversation-container') || el.classList.contains('react-scroll-to-bottom--css') || el.classList.contains('conversation-container'));
    const containsUserMessage = !!(el.querySelector('[data-role="user"], [data-testid*="user-message"]') || el.getAttribute('data-role') === 'user');
    const containsAssistantResponse = !!(el.querySelector('[data-role="assistant"], [data-testid*="assistant-message"]') || el.getAttribute('data-role') === 'assistant');
    const containsCode = !!el.querySelector('pre, code');
    const containsImage = !!el.querySelector('article img, .markdown img, .prose img');
    const containsTable = !!el.querySelector('article table, .markdown table, .prose table');

    // DISCLAIMER CANDIDATE LOG
    if (key === "disclaimer") {
      const containsProtected = el.querySelector(
        'article, pre, code, article img, .markdown img, .prose img, article table, .markdown table, .prose table, .react-scroll-to-bottom--css, .conversation-container, [data-role="user"], [data-role="assistant"], [data-testid*="user-message"], [data-testid*="assistant-message"]'
      );
      const isComposer = el.tagName === 'FORM' || el.id === 'composer-form' || el.querySelector('#prompt-textarea');
      const isLarge = el.querySelectorAll('*').length > 15 || (el.getBoundingClientRect().width > window.innerWidth * 0.4 && el.getBoundingClientRect().height > window.innerHeight * 0.4);

      const conversationContainer = document.querySelector('.react-scroll-to-bottom--css, .conversation-container');
      const isAncestor = conversationContainer && el.contains(conversationContainer);

      const safeToHide = !containsProtected && !isComposer && !isLarge && !isAncestor && !this.isProtected(el);

      console.log(`[FocusAI] Disclaimer candidate found

Element: ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}
Tag: ${tag}
Class: ${className}
Text: ${textPreview}
Parent: ${parent}
Contains protected content: ${containsProtected ? "YES" : "NO"}
Safe to hide: ${safeToHide ? "YES" : "NO"}`);

      if (!safeToHide) {
        let reason = "Unsafe ancestor / protected content detected.";
        if (isComposer) reason = "Target is the composer container.";
        if (isLarge) reason = "Target is too large.";
        console.log(`[FocusAI] Disclaimer hide rejected

Reason:
${reason}`);
        return false;
      }
    } else {
      // Print HIDE TARGET log for standard elements
      console.log(`[FocusAI] HIDE TARGET

Category: ${category}
Tag: ${tag}
Class: ${className}
ID: ${id}
Role: ${role}
Selector: ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}
Text preview: ${textPreview}
Parent: ${parent}
Contains conversation: ${containsConversation ? "YES" : "NO"}
Contains user message: ${containsUserMessage ? "YES" : "NO"}
Contains assistant response: ${containsAssistantResponse ? "YES" : "NO"}
Contains code: ${containsCode ? "YES" : "NO"}
Contains image: ${containsImage ? "YES" : "NO"}
Contains table: ${containsTable ? "YES" : "NO"}`);
    }

    // Safety checks
    if (this.isProtected(el)) {
      console.log(`[FocusAI] REFUSED UNSAFE HIDE TARGET

Reason:
Target contains protected learning content.`);
      return false;
    }

    // Save style states
    const styleId = `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    el.setAttribute('data-focusai-style-id', styleId);
    el.setAttribute('data-focusai-modified', 'true');
    el.setAttribute('data-focusai-hidden', 'true');

    originalStyles[styleId] = {
      element: el,
      display: el.style.display,
      visibility: el.style.visibility,
      opacity: el.style.opacity,
      position: el.style.position,
      width: el.style.width,
      height: el.style.height
    };

    // Apply hiding
    el.style.display = 'none';

    if (key === "disclaimer") {
      console.log("[FocusAI] Disclaimer hidden");
    }

    return true;
  },

  /**
   * Safe, exact element restorer
   */
  _safeRestoreElement: function(el) {
    if (!el) return;

    const styleId = el.getAttribute('data-focusai-style-id');
    if (styleId && originalStyles[styleId]) {
      const orig = originalStyles[styleId];

      // Restore styles exactly
      el.style.display = orig.display;
      el.style.visibility = orig.visibility;
      el.style.opacity = orig.opacity;
      el.style.position = orig.position;
      el.style.width = orig.width;
      el.style.height = orig.height;

      delete originalStyles[styleId];
    }

    // Remove all FocusAI attributes
    el.removeAttribute('data-focusai-style-id');
    el.removeAttribute('data-focusai-modified');
    el.removeAttribute('data-focusai-hidden');
  },

  /**
   * Resolves the actual live DOM element from its selector used during discovery
   */
  _resolveElementFromSelector: function(selector, category) {
    if (category === 'DISCLAIMER') {
      return this._findDisclaimerElement();
    }
    if (!selector) return null;

    // Text matching selector fallback
    if (selector.startsWith('element-containing-text:')) {
      return this._findDisclaimerElement();
    }

    // Standard CSS Selector
    try {
      return document.querySelector(selector);
    } catch (e) {
      console.warn(`[FocusAI] Failed to query selector "${selector}":`, e);
      return null;
    }
  },

  /**
   * Injects the compact FocusAI floating controls at bottom-right
   */
  _injectFloatingControls: function() {
    // Prevent duplicated panels
    if (document.getElementById('focusai-floating-panel')) {
      return;
    }

    // Create container
    const panel = document.createElement('div');
    panel.id = 'focusai-floating-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 18px;
      right: 18px;
      z-index: 999999;
      background-color: rgba(20, 20, 20, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.10);
      backdrop-filter: blur(4px);
      border-radius: 8px;
      padding: 5px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 150px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    // 1. Ask New Question / Hide Search Bar button
    const toggleComposerBtn = document.createElement('button');
    toggleComposerBtn.id = 'focusai-toggle-composer-btn';
    toggleComposerBtn.textContent = 'Ask New Question';
    toggleComposerBtn.style.cssText = `
      background-color: rgba(40, 40, 40, 0.6);
      color: #D4D4D8;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 5px;
      height: 28px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      text-align: center;
      transition: background-color 0.15s ease, color 0.15s ease;
      font-family: inherit;
    `;
    toggleComposerBtn.addEventListener('mouseenter', () => {
      toggleComposerBtn.style.backgroundColor = 'rgba(60, 60, 60, 0.8)';
      toggleComposerBtn.style.color = '#FAFAFA';
    });
    toggleComposerBtn.addEventListener('mouseleave', () => {
      toggleComposerBtn.style.backgroundColor = 'rgba(40, 40, 40, 0.6)';
      toggleComposerBtn.style.color = '#D4D4D8';
    });

    toggleComposerBtn.addEventListener('click', () => {
      // Find the real composer
      const composerElement = this._resolveElementFromSelector('#composer-form', 'COMPOSER') ||
                              this._resolveElementFromSelector('form', 'COMPOSER') ||
                              document.querySelector('form');

      if (!composerElement) {
        console.warn("[FocusAI] Could not find the real ChatGPT composer form to toggle.");
        return;
      }

      const isHidden = composerElement.style.display === 'none' || composerElement.getAttribute('data-focusai-hidden') === 'true';

      if (isHidden) {
        // Show real composer
        composerElement.style.display = '';
        composerElement.removeAttribute('data-focusai-hidden');
        toggleComposerBtn.textContent = 'Hide Search Bar';

        // Focus the input if safely possible
        const textarea = composerElement.querySelector('#prompt-textarea') || composerElement.querySelector('textarea') || composerElement.querySelector('[contenteditable="true"]');
        if (textarea) {
          setTimeout(() => {
            try {
              textarea.focus();
            } catch (err) {
              console.debug("[FocusAI] Safe focus ignored:", err);
            }
          }, 50);
        }

        // Scroll the workspace page appropriately
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } else {
        // Hide real composer
        composerElement.style.display = 'none';
        composerElement.setAttribute('data-focusai-hidden', 'true');
        toggleComposerBtn.textContent = 'Ask New Question';
      }
    });

    // 2. Exit Focus button
    const exitFocusBtn = document.createElement('button');
    exitFocusBtn.id = 'focusai-exit-focus-btn';
    exitFocusBtn.textContent = 'Exit Focus';
    exitFocusBtn.style.cssText = `
      background-color: transparent;
      color: #A1A1AA;
      border: 1px solid transparent;
      border-radius: 5px;
      height: 28px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      text-align: center;
      transition: background-color 0.15s ease, color 0.15s ease;
      font-family: inherit;
    `;
    exitFocusBtn.addEventListener('mouseenter', () => {
      exitFocusBtn.style.backgroundColor = 'rgba(60, 60, 60, 0.5)';
      exitFocusBtn.style.color = '#FAFAFA';
    });
    exitFocusBtn.addEventListener('mouseleave', () => {
      exitFocusBtn.style.backgroundColor = 'transparent';
      exitFocusBtn.style.color = '#A1A1AA';
    });

    exitFocusBtn.addEventListener('click', () => {
      // Disable Focus Mode first locally
      this.disableFocusMode();

      // Synchronize the state back to Popup & Service Worker by updating the chrome local storage
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const types = self.FocusAI && self.FocusAI.Messaging && self.FocusAI.Messaging.Types;
        if (types) {
          chrome.runtime.sendMessage({
            type: types.SET_FOCUS_STATE,
            payload: { PharmacistIsHere: true, enabled: false }
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[FocusAI] Exit focus sync message failed:', chrome.runtime.lastError.message);
            } else {
              console.log('[FocusAI] Exit focus synced successfully via sendMessage:', response);
            }
          });
        }
      }
    });

    panel.appendChild(toggleComposerBtn);
    panel.appendChild(exitFocusBtn);
    document.body.appendChild(panel);
  },

  /**
   * Removes floating FocusAI controls
   */
  _removeFloatingControls: function() {
    const panel = document.getElementById('focusai-floating-panel');
    if (panel) {
      panel.remove();
    }
  },

  /**
   * Safe ChatGPT UI Discovery & Element Classification (PHASE -2)
   */
  discoverElements: function() {
    if (typeof document === 'undefined') {
      return { success: false, error: "document object is unavailable." };
    }

    const turns = this._classifyMessageTurns();

    const report = {
      sidebar: this._classifySidebar(),
      sidebarNavigation: this._classifySidebarNavigation(),
      sidebarHistory: this._classifySidebarHistory(),
      sidebarControls: this._classifySidebarControls(),
      header: this._classifyHeader(),
      headerActions: this._classifyHeaderActions(),
      modelSelector: this._classifyModelSelector(),
      share: this._classifyShare(),
      moreMenu: this._classifyMoreMenu(),
      conversation: this._classifyConversation(turns.allTurns),
      userMessages: this._classifyUserMessages(turns.userTurns),
      assistantResponses: this._classifyAssistantResponses(turns.assistantTurns),
      messageActions: this._classifyMessageActions(turns.assistantTurns),
      codeBlocks: this._classifyCodeBlocks(turns.assistantTurns),
      images: this._classifyImages(turns.assistantTurns),
      tables: this._classifyTables(turns.assistantTurns),
      generatedContent: this._classifyGeneratedContent(turns.assistantTurns),
      disclaimer: this._classifyDisclaimer(),
      composer: this._classifyComposer(),
      composerControls: this._classifyComposerControls()
    };

    return report;
  },

  /**
   * Internal Helper to analyze all message turns (<article>) synchronously
   */
  _classifyMessageTurns: function() {
    const articles = Array.from(document.querySelectorAll('article'));
    const userTurns = [];
    const assistantTurns = [];

    articles.forEach(art => {
      // Locale-independent action detection
      const hasAssistantActions = art.querySelector('button[aria-label*="Copy" i], button[aria-label*="response" i], button[aria-label*="regenerate" i], .message-actions-toolbar, [class*="thumbs"], [aria-label*="Thumbs"]');
      const hasUserActions = art.querySelector('button[aria-label*="Edit" i]');
      const hasMarkdown = art.querySelector('.markdown, .prose, pre, table');

      if (hasAssistantActions && !hasUserActions) {
        assistantTurns.push(art);
      } else if (hasUserActions) {
        userTurns.push(art);
      } else if (hasMarkdown) {
        // If it contains formatted markdown, it is almost certainly an assistant turn
        assistantTurns.push(art);
      } else {
        // Default relative fallback
        userTurns.push(art);
      }
    });

    return {
      allTurns: articles,
      userTurns: userTurns,
      assistantTurns: assistantTurns
    };
  },

  /**
   * Category Heuristics - SIDEBAR
   */
  _classifySidebar: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const candidates = [
      document.querySelector('nav[aria-label*="history" i]'),
      document.querySelector('nav[aria-label*="sidebar" i]'),
      document.querySelector('nav[aria-label*="Navigation" i]'),
      document.querySelector('nav'),
      document.querySelector('[data-sidebar]'),
      document.querySelector('.sidebar'),
      document.getElementById('sidebar'),
      document.querySelector('aside')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.3;
      signals.push("Located HTML node match");

      if (element.tagName === "NAV" || element.tagName === "ASIDE") {
        confidence += 0.2;
        signals.push(`Semantic HTML <${element.tagName.toLowerCase()}> tag match`);
      }

      const ariaLabel = element.getAttribute("aria-label") || "";
      if (ariaLabel.toLowerCase().includes("history") || ariaLabel.toLowerCase().includes("sidebar") || ariaLabel.toLowerCase().includes("navigation")) {
        confidence += 0.25;
        signals.push(`ARIA label matches sidebar context ("${ariaLabel}")`);
      }

      if (rect.left === 0 && rect.width > 100 && rect.width < 450) {
        confidence += 0.25;
        signals.push("Left-side layouts matching sidebar dimensions");
      }

      selectorUsed = element.id ? `#${element.id}` : element.tagName.toLowerCase();
    }

    return {
      found,
      category: "SIDEBAR",
      confidence: Math.min(1.0, confidence),
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  _classifySidebarNavigation: function() {
    const sidebar = document.querySelector('nav') || document.querySelector('aside');
    const found = !!(sidebar && sidebar.querySelector('a, button'));
    return {
      found,
      category: "SIDEBAR_NAVIGATION",
      confidence: found ? 0.90 : 0.0,
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals: found ? ["Found interactive navigation elements inside sidebar"] : [],
      selectorUsed: "nav a, nav button",
      tag: "A",
      dimensions: "N/A"
    };
  },

  _classifySidebarHistory: function() {
    const historyList = document.querySelector('.history-list') || document.querySelector('nav div[style*="overflow-y"]') || document.querySelector('nav');
    const found = !!(historyList && historyList.querySelectorAll('a').length > 0);
    return {
      found,
      category: "SIDEBAR_HISTORY",
      confidence: found ? 0.92 : 0.0,
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals: found ? ["Found historical conversation elements inside nav container"] : [],
      selectorUsed: ".history-list",
      tag: "DIV",
      dimensions: "N/A"
    };
  },

  _classifySidebarControls: function() {
    const controls = document.querySelector('.account-profile') || document.querySelector('nav button[aria-label*="Settings" i]') || document.querySelector('nav');
    const found = !!controls;
    return {
      found,
      category: "SIDEBAR_CONTROLS",
      confidence: found ? 0.88 : 0.0,
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals: found ? ["Located account, profile, or settings controls inside nav panel"] : [],
      selectorUsed: ".account-profile",
      tag: "DIV",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - HEADER
   */
  _classifyHeader: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const candidates = [
      document.querySelector('header'),
      document.querySelector('div[role="banner"]'),
      document.querySelector('.header'),
      document.querySelector('.top-bar'),
      document.querySelector('div[style*="position: sticky"][style*="top: 0"]'),
      document.querySelector('div[style*="position: fixed"][style*="top: 0"]')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.3;
      signals.push("Located HTML node match");

      if (element.tagName === "HEADER" || element.getAttribute("role") === "banner") {
        confidence += 0.3;
        signals.push("Semantic header tag or role banner match");
      }

      if (rect.top === 0 && rect.height > 20 && rect.height < 120) {
        confidence += 0.3;
        signals.push("Top sticky/fixed coordinates");
      }

      if (element.querySelector('[aria-haspopup="menu"]') || element.innerText.includes("ChatGPT")) {
        confidence += 0.1;
        signals.push("Contains model selection indicator elements");
      }

      selectorUsed = element.tagName.toLowerCase();
    }

    return {
      found,
      category: "HEADER",
      confidence: Math.min(1.0, confidence),
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  /**
   * Category Heuristics - HEADER ACTIONS
   */
  _classifyHeaderActions: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const candidates = [
      document.querySelector('button[aria-label*="Share" i]'),
      document.querySelector('button[aria-label*="options" i]'),
      document.querySelector('button[aria-label*="More" i]'),
      document.querySelector('.top-right-actions'),
      document.querySelector('header button'),
      document.querySelector('button[aria-haspopup="menu"]')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.4;
      signals.push("Located interaction node match");

      const label = element.getAttribute("aria-label") || element.innerText || "";
      if (/share|more|options|settings|menu/i.test(label)) {
        confidence += 0.4;
        signals.push(`ARIA label or text content matches top-right option context ("${label.trim()}")`);
      }

      if (rect.top < 100 && rect.right > (window.innerWidth - 300)) {
        confidence += 0.2;
        signals.push("Top-right quadrant coordinates");
      }

      selectorUsed = `button[aria-label="${label.replace(/"/g, '\\"')}"]`;
    }

    return {
      found,
      category: "HEADER_ACTIONS",
      confidence: Math.min(1.0, confidence),
      protected: false,
      futureHideCandidate: true,
      safeCandidate: false,
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  _classifyModelSelector: function() {
    const selector = document.querySelector('button[aria-haspopup="menu"]') || document.querySelector('header button');
    const found = !!selector;
    return {
      found,
      category: "MODEL_SELECTOR",
      confidence: found ? 0.90 : 0.0,
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals: found ? ["Located model selector dropdown trigger in header bar"] : [],
      selectorUsed: "button[aria-haspopup=\"menu\"]",
      tag: "BUTTON",
      dimensions: "N/A"
    };
  },

  _classifyShare: function() {
    const shareBtn = document.querySelector('button[aria-label*="Share" i]') || document.querySelector('header button[aria-label*="share" i]');
    const found = !!shareBtn;
    return {
      found,
      category: "SHARE",
      confidence: found ? 0.95 : 0.0,
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals: found ? ["Located share button inside header actions"] : [],
      selectorUsed: "button[aria-label*=\"Share\"]",
      tag: "BUTTON",
      dimensions: "N/A"
    };
  },

  _classifyMoreMenu: function() {
    const moreBtn = document.querySelector('button[aria-label*="options" i]') || document.querySelector('button[aria-label*="More" i]');
    const found = !!moreBtn;
    return {
      found,
      category: "MORE_MENU",
      confidence: found ? 0.93 : 0.0,
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals: found ? ["Located options menu trigger button inside header bar"] : [],
      selectorUsed: "button[aria-label*=\"More\"]",
      tag: "BUTTON",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - CONVERSATION (CONTENT) - Protected (Confidence >= 0.85)
   */
  _classifyConversation: function(articles) {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    // Direct parent structure tracking: if we found `<article>` elements, find their closest common parent!
    let element = null;
    if (articles && articles.length > 0) {
      element = articles[0].parentElement;
      signals.push(`Direct common parent tracking from active message articles`);
    }

    if (!element) {
      const candidates = [
        document.querySelector('.react-scroll-to-bottom--css'),
        document.querySelector('[role="presentation"] .flex-col'),
        document.querySelector('div[data-testid*="conversation-turn"]')?.parentElement,
        document.querySelector('.conversation-container'),
        document.querySelector('main .flex-col')
      ];
      element = candidates.find(el => el !== null);
    }

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.4;
      signals.push("Located main structural conversation parent");

      // Verify the presence of chat content children
      const turnCount = articles ? articles.length : element.querySelectorAll('article').length;
      const codeBlocks = element.querySelectorAll('pre, code');
      const tables = element.querySelectorAll('table');

      if (turnCount > 0) {
        confidence += 0.35;
        signals.push(`Contains message turns / articles (count: ${turnCount})`);
      }
      if (codeBlocks.length > 0) {
        confidence += 0.15;
        signals.push(`Contains code/markdown blocks (count: ${codeBlocks.length})`);
      }
      if (tables.length > 0) {
        confidence += 0.15;
        signals.push(`Contains tables (count: ${tables.length})`);
      }

      selectorUsed = element.className ? `.${element.className.trim().split(/\s+/)[0]}` : "div";
    }

    return {
      found,
      category: "CONVERSATION",
      confidence: Math.min(1.0, confidence),
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  /**
   * Category Heuristics - USER MESSAGES (CONTENT) - Protected
   */
  _classifyUserMessages: function(userTurns) {
    const found = !!(userTurns && userTurns.length > 0);
    const signals = found ? [
      `Successfully located ${userTurns.length} user question turns using negative and edit-action heuristics`
    ] : [];

    return {
      found,
      category: "USER_MESSAGES",
      confidence: found ? 0.95 : 0.0,
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals,
      selectorUsed: 'article:not(:has(.markdown)):not(:has(button[aria-label*="Copy"]))',
      tag: found ? "ARTICLE" : "N/A",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - ASSISTANT RESPONSES (CONTENT) - Protected
   */
  _classifyAssistantResponses: function(assistantTurns) {
    const found = !!(assistantTurns && assistantTurns.length > 0);
    const signals = found ? [
      `Successfully located ${assistantTurns.length} assistant response turns using action-presence and markdown-content heuristics`
    ] : [];

    return {
      found,
      category: "ASSISTANT_RESPONSES",
      confidence: found ? 0.96 : 0.0,
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals,
      selectorUsed: 'article:has(.markdown), article:has(button[aria-label*="Copy"])',
      tag: found ? "ARTICLE" : "N/A",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - MESSAGE ACTIONS (Response control toolbars)
   */
  _classifyMessageActions: function(assistantTurns) {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const actionButtons = [];
    if (assistantTurns && assistantTurns.length > 0) {
      assistantTurns.forEach(art => {
        const buttons = Array.from(art.querySelectorAll('button'));
        buttons.forEach(btn => {
          if (!btn.closest('.markdown') && !btn.closest('.prose')) {
            actionButtons.push(btn);
          }
        });
      });
    }

    if (actionButtons.length > 0) {
      found = true;
      const element = actionButtons[0];
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.45;
      signals.push(`Discovered ${actionButtons.length} localized action buttons outside Assistant markdown content bodies`);

      const ariaLabel = element.getAttribute("aria-label") || "";
      if (ariaLabel) {
        confidence += 0.3;
        signals.push(`Matched accessory trigger info ("${ariaLabel}")`);
      }

      confidence += 0.25;
      signals.push("Located adjacent to or nested inside Assistant response block");

      selectorUsed = "article button:not(.markdown button)";
    }

    return {
      found,
      category: "MESSAGE_ACTIONS",
      confidence: Math.min(1.0, confidence),
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  _classifyCodeBlocks: function(assistantTurns) {
    let found = false;
    let count = 0;
    if (assistantTurns && assistantTurns.length > 0) {
      assistantTurns.forEach(art => {
        const codeElements = art.querySelectorAll('pre, code');
        count += codeElements.length;
      });
      found = count > 0;
    }
    return {
      found,
      category: "CODE_BLOCKS",
      confidence: found ? 0.95 : 0.0,
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals: found ? [`Found ${count} code/syntax components inside protected response bodies`] : [],
      selectorUsed: "article pre, article code",
      tag: "PRE",
      dimensions: "N/A"
    };
  },

  _classifyImages: function(assistantTurns) {
    let found = false;
    let count = 0;
    if (assistantTurns && assistantTurns.length > 0) {
      assistantTurns.forEach(art => {
        const imgElements = art.querySelectorAll('img');
        count += imgElements.length;
      });
      found = count > 0;
    }
    return {
      found,
      category: "IMAGES",
      confidence: found ? 0.90 : 0.0,
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals: found ? [`Found ${count} image/visual structures inside protected response bodies`] : [],
      selectorUsed: "article img",
      tag: "IMG",
      dimensions: "N/A"
    };
  },

  _classifyTables: function(assistantTurns) {
    let found = false;
    let count = 0;
    if (assistantTurns && assistantTurns.length > 0) {
      assistantTurns.forEach(art => {
        const tableElements = art.querySelectorAll('table');
        count += tableElements.length;
      });
      found = count > 0;
    }
    return {
      found,
      category: "TABLES",
      confidence: found ? 0.92 : 0.0,
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals: found ? [`Found ${count} table data structures inside protected response bodies`] : [],
      selectorUsed: "article table",
      tag: "TABLE",
      dimensions: "N/A"
    };
  },

  _classifyGeneratedContent: function(assistantTurns) {
    const found = !!(assistantTurns && assistantTurns.length > 0);
    return {
      found,
      category: "GENERATED_CONTENT",
      confidence: found ? 0.95 : 0.0,
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals: found ? ["Found paragraphs and markup layout representing assistant explanations"] : [],
      selectorUsed: "article .markdown p",
      tag: "P",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - DISCLAIMER
   */
  _classifyDisclaimer: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const allParagraphsAndSpans = Array.from(document.querySelectorAll('p, span, div'));
    let element = allParagraphsAndSpans.find(el => {
      if (el.children.length > 2) return false;
      if (el.querySelector('form, textarea, nav, header')) return false; // Negative guard
      const text = (el.textContent || "").toLowerCase();
      return (
        text.includes("can make mistakes") ||
        text.includes("check important info") ||
        text.includes("check response") ||
        text.includes("pueden cometer") ||
        text.includes("fehler machen") ||
        text.includes("peut se tromper")
      );
    });

    if (!element) {
      const forms = Array.from(document.querySelectorAll('form'));
      if (forms.length > 0) {
        const lastForm = forms[forms.length - 1];
        const elementsBelowForm = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
          if (el.children.length > 0) return false;
          if (el.querySelector('form, textarea, nav, header')) return false; // Negative guard
          const rect = el.getBoundingClientRect();
          const formRect = lastForm.getBoundingClientRect();
          return rect.top > formRect.bottom && rect.height > 5 && rect.height < 45;
        });
        if (elementsBelowForm.length > 0) {
          element = elementsBelowForm[0];
          signals.push("Located footer-level text element below main Composer form");
        }
      }
    }

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.45;
      signals.push("Located text-matching/position-matching footer node");

      const text = element.textContent || "";
      if (/mistakes|info|errors|limitations|errores|fehler|tromper/i.test(text)) {
        confidence += 0.30;
        signals.push("Matched keyword disclaimer text sequences");
      }

      if (rect.top > (window.innerHeight - 200)) {
        confidence += 0.25;
        signals.push("Bottom footer-level placement coordinates");
      }

      selectorUsed = `element-containing-text: "${text.substring(0, 30).trim()}..."`;
    }

    return {
      found,
      category: "DISCLAIMER",
      confidence: Math.min(1.0, confidence),
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  /**
   * Category Heuristics - COMPOSER
   */
  _classifyComposer: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const textInput = document.querySelector('#prompt-textarea') || document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');

    if (textInput) {
      const element = textInput.closest('form') || textInput.closest('div[role="presentation"]') || textInput.parentElement;

      if (element) {
        found = true;
        tag = element.tagName;
        const rect = element.getBoundingClientRect();
        dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

        confidence += 0.45;
        signals.push("Located parent composer container of text input");

        if (element.tagName === "FORM") {
          confidence += 0.35;
          signals.push("Constructed as a standard interactive HTML form");
        } else {
          confidence += 0.15;
          signals.push("Container acts as a text input structural presentation box");
        }

        if (rect.top > (window.innerHeight - 350)) {
          confidence += 0.20;
          signals.push("Lower viewport interactive coordinates");
        }

        selectorUsed = element.id ? `#${element.id}` : element.tagName.toLowerCase();
      }
    }

    return {
      found,
      category: "COMPOSER",
      confidence: Math.min(1.0, confidence),
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  /**
   * Category Heuristics - COMPOSER CONTROLS
   */
  _classifyComposerControls: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;

    const elements = [
      document.querySelector('button[data-testid*="send-button"]'),
      document.querySelector('button[aria-label*="Attach" i]'),
      document.querySelector('button[aria-label*="microphone" i]'),
      document.querySelector('button[aria-label*="voice" i]'),
      document.querySelector('input[type="file"]')
    ].filter(el => el !== null);

    if (elements.length > 0) {
      found = true;
      confidence += 0.5;
      signals.push(`Found ${elements.length} active composer accessory controls`);

      const firstEl = elements[0];
      const isInsideForm = firstEl.closest('form') || firstEl.closest('[id*="composer"]');
      if (isInsideForm) {
        confidence += 0.3;
        signals.push("Controls are nested within the main Composer form");
      }

      const ariaLabel = firstEl.getAttribute("aria-label") || firstEl.getAttribute("data-testid") || "";
      if (/send|attach|upload|file|mic|voice|speech/i.test(ariaLabel)) {
        confidence += 0.2;
        signals.push(`Validated controller context ("${ariaLabel}")`);
      }
    }

    return {
      found,
      category: "COMPOSER_CONTROLS",
      confidence: Math.min(1.0, confidence),
      protected: false,
      futureHideCandidate: true,
      safeCandidate: true,
      signals,
      selectorUsed: 'form button, input[type="file"]',
      tag: found ? "BUTTON" : "N/A",
      dimensions: "N/A"
    };
  }
};
