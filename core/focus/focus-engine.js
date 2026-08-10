/**
 * FocusAI - Focus Engine Module
 * Interface for controlling Focus Mode state and executing safe ChatGPT UI discovery & classification.
 */

self.FocusAI = self.FocusAI || {};

self.FocusAI.FocusEngine = {
  /**
   * Enables Focus Mode on the page (Placeholder for future phases).
   * @returns {Object} A safe result indicating the feature is not implemented yet.
   */
  enableFocusMode: function() {
    console.log("FocusEngine: enableFocusMode called (not implemented in Phase -2)");
    return {
      success: false,
      implemented: false,
      message: "Focus Mode functionality is not implemented in Phase -2."
    };
  },

  /**
   * Disables Focus Mode on the page (Placeholder for future phases).
   * @returns {Object} A safe result indicating the feature is not implemented yet.
   */
  disableFocusMode: function() {
    console.log("FocusEngine: disableFocusMode called (not implemented in Phase -2)");
    return {
      success: false,
      implemented: false,
      message: "Focus Mode functionality is not implemented in Phase -2."
    };
  },

  /**
   * Retrieves the current Focus Mode status.
   * @returns {Object} The default status structure.
   */
  getFocusState: function() {
    return {
      focusEnabled: false,
      implemented: false
    };
  },

  /**
   * Safe ChatGPT UI Discovery & Element Classification (PHASE -2)
   * Safely analyzes the live DOM to discover, classify, and evaluate elements,
   * distinguishing between protected learning content and future hide candidates.
   *
   * This function is STRICTLY READ-ONLY. It never modifies any styles, DOM, or layouts.
   *
   * @returns {Object} A serializable structured metadata report of discovered elements.
   */
  discoverElements: function() {
    if (typeof document === 'undefined') {
      return { success: false, error: "document object is unavailable." };
    }

    const report = {
      sidebar: this._classifySidebar(),
      header: this._classifyHeader(),
      headerActions: this._classifyHeaderActions(),
      conversation: this._classifyConversation(),
      userMessages: this._classifyUserMessages(),
      assistantResponses: this._classifyAssistantResponses(),
      messageActions: this._classifyMessageActions(),
      disclaimer: this._classifyDisclaimer(),
      composer: this._classifyComposer(),
      composerControls: this._classifyComposerControls()
    };

    return report;
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

    // Selector strategies
    const candidates = [
      document.querySelector('nav[aria-label*="history" i]'),
      document.querySelector('nav[aria-label*="sidebar" i]'),
      document.querySelector('nav[aria-label*="Navigation" i]'),
      document.querySelector('nav'),
      document.querySelector('[data-sidebar]'),
      document.querySelector('.sidebar'),
      document.getElementById('sidebar')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.3; // Found element
      signals.push("Located HTML node match");

      if (element.tagName === "NAV") {
        confidence += 0.2;
        signals.push("Semantic HTML <nav> tag match");
      }

      const ariaLabel = element.getAttribute("aria-label") || "";
      if (ariaLabel.toLowerCase().includes("history") || ariaLabel.toLowerCase().includes("sidebar") || ariaLabel.toLowerCase().includes("navigation")) {
        confidence += 0.25;
        signals.push(`ARIA label matches sidebar context ("${ariaLabel}")`);
      }

      // Geolocation check (is it pinned on the left?)
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

      // Check model selector dropdown indicators
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
   * Category Heuristics - HEADER ACTIONS / CONVERSATION ACTIONS
   */
  _classifyHeaderActions: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    // Look for share buttons, settings button, options menus near header or top-right
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

      // Position check
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
      safeCandidate: false, // marked false to exercise careful discovery handling as specified
      signals,
      selectorUsed,
      tag,
      dimensions
    };
  },

  /**
   * Category Heuristics - CONVERSATION (CONTENT) - Protected
   */
  _classifyConversation: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const candidates = [
      document.querySelector('.react-scroll-to-bottom--css'),
      document.querySelector('[role="presentation"] .flex-col'),
      document.querySelector('div[data-testid*="conversation-turn"]'),
      document.querySelector('.conversation-container'),
      document.querySelector('main .flex-col')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.3;
      signals.push("Located main structural parent turn/scroller");

      // Verify children contain core learning elements like code blocks, tables, lists, or alternate turns
      const codeBlocks = element.querySelectorAll('pre, code');
      const tables = element.querySelectorAll('table');
      const userTurns = element.querySelectorAll('[data-testid*="user-message"], [data-role="user"]');
      const assistantTurns = element.querySelectorAll('[data-testid*="assistant-message"], [data-role="assistant"]');

      if (codeBlocks.length > 0) {
        confidence += 0.2;
        signals.push(`Contains helper code elements (${codeBlocks.length} found)`);
      }
      if (tables.length > 0) {
        confidence += 0.1;
        signals.push("Contains structured data tables");
      }
      if (userTurns.length > 0 || assistantTurns.length > 0) {
        confidence += 0.3;
        signals.push(`Contains explicit user/assistant turns (turns detected: ${userTurns.length + assistantTurns.length})`);
      } else {
        // Fallback checks
        confidence += 0.1;
        signals.push("Default content flow matching scrollable layouts");
      }

      selectorUsed = element.className ? `.${element.className.trim().split(/\s+/)[0]}` : "div";
    }

    return {
      found,
      category: "CONTENT",
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
  _classifyUserMessages: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;

    const elements = document.querySelectorAll('[data-testid*="user-message"], [data-role="user"], div.group[data-role="user"]');

    if (elements.length > 0) {
      found = true;
      confidence += 0.5;
      signals.push(`Found ${elements.length} active user question turns`);

      const firstEl = elements[0];
      if (firstEl.tagName === "DIV") {
        confidence += 0.2;
      }
      if (firstEl.getAttribute("data-role") === "user" || firstEl.getAttribute("data-testid")?.includes("user")) {
        confidence += 0.3;
        signals.push("Matched user role attributes explicitly");
      }
    } else {
      // Look for fallback patterns (e.g. elements on the right or user icon)
      const fallbackUserText = document.querySelector('div[style*="text-align: right"]');
      if (fallbackUserText) {
        found = true;
        confidence = 0.6;
        signals.push("Matched user message via style alignment heuristics");
      }
    }

    return {
      found,
      category: "USER_MESSAGES",
      confidence: Math.min(1.0, confidence),
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals,
      selectorUsed: '[data-role="user"]',
      tag: found ? "DIV" : "N/A",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - ASSISTANT RESPONSES (CONTENT) - Protected
   */
  _classifyAssistantResponses: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;

    const elements = document.querySelectorAll('[data-testid*="assistant-message"], [data-role="assistant"], div.group[data-role="assistant"]');

    if (elements.length > 0) {
      found = true;
      confidence += 0.5;
      signals.push(`Found ${elements.length} assistant response turns`);

      const firstEl = elements[0];
      if (firstEl.getAttribute("data-role") === "assistant" || firstEl.getAttribute("data-testid")?.includes("assistant")) {
        confidence += 0.3;
        signals.push("Matched assistant role attributes explicitly");
      }
      if (firstEl.querySelector('pre, code, p, table, ul, ol')) {
        confidence += 0.2;
        signals.push("Contains markdown content elements (paragraphs, code, tables, lists)");
      }
    } else {
      // Fallback: search paragraph structures inside chat container
      const genericParagraph = document.querySelector('p');
      if (genericParagraph) {
        found = true;
        confidence = 0.6;
        signals.push("Matched generic content containers fallback");
      }
    }

    return {
      found,
      category: "ASSISTANT_MESSAGES",
      confidence: Math.min(1.0, confidence),
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals,
      selectorUsed: '[data-role="assistant"]',
      tag: found ? "DIV" : "N/A",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - MESSAGE ACTIONS (Response control toolbars)
   */
  _classifyMessageActions: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    const candidates = [
      document.querySelector('button[aria-label*="Copy" i]'),
      document.querySelector('button[aria-label*="Good response" i]'),
      document.querySelector('button[aria-label*="Bad response" i]'),
      document.querySelector('button[aria-label*="Read aloud" i]'),
      document.querySelector('button[aria-label*="Regenerate" i]'),
      document.querySelector('.message-actions-toolbar')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.4;
      signals.push("Located message feedback control button");

      const ariaLabel = element.getAttribute("aria-label") || "";
      if (/copy|response|thumbs|like|dislike|read|sound|regenerate/i.test(ariaLabel)) {
        confidence += 0.4;
        signals.push(`ARIA label matches message action toolbar context ("${ariaLabel}")`);
      }

      // Check if it's nested near or inside assistant block
      const isNearAssistant = element.closest('[data-role="assistant"]') || element.closest('[data-testid*="assistant"]');
      if (isNearAssistant) {
        confidence += 0.2;
        signals.push("Located adjacent to or inside Assistant message bubble");
      }

      selectorUsed = `button[aria-label="${ariaLabel.replace(/"/g, '\\"')}"]`;
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

  /**
   * Category Heuristics - BOTTOM DISCLAIMER
   */
  _classifyDisclaimer: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    // Text-based matching on live DOM nodes
    const allParagraphsAndSpans = Array.from(document.querySelectorAll('p, span, div'));
    const element = allParagraphsAndSpans.find(el => {
      if (el.children.length > 2) return false; // look for flat leaf text elements
      const text = (el.textContent || "").toLowerCase();
      return (
        text.includes("can make mistakes") ||
        text.includes("check important info") ||
        text.includes("check response")
      );
    });

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.4;
      signals.push("Located text-matching DOM node");

      const text = element.textContent || "";
      if (text.includes("ChatGPT can make mistakes")) {
        confidence += 0.3;
        signals.push("Matched full core ChatGPT disclaimer text sequence");
      } else {
        confidence += 0.15;
        signals.push("Matched partial disclaimer text sequence");
      }

      // Verify position (is it in the lower part of the screen?)
      if (rect.top > (window.innerHeight - 200)) {
        confidence += 0.3;
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

    const candidates = [
      document.querySelector('#prompt-textarea')?.closest('form'),
      document.querySelector('#prompt-textarea')?.closest('div[role="presentation"]'),
      document.querySelector('form[action*="chat"]'),
      document.querySelector('.composer-container'),
      document.querySelector('main form')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.3;
      signals.push("Located composer wrapper node match");

      if (element.querySelector('#prompt-textarea')) {
        confidence += 0.4;
        signals.push("Contains core '#prompt-textarea' input node child");
      }

      if (element.tagName === "FORM") {
        confidence += 0.1;
        signals.push("Constructed as a standard interactive HTML form");
      }

      if (rect.top > (window.innerHeight - 350)) {
        confidence += 0.2;
        signals.push("Lower viewport interactive coordinates");
      }

      selectorUsed = element.id ? `#${element.id}` : element.tagName.toLowerCase();
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

    // Look for attach button, microphone, send button inside or around composer
    const elements = [
      document.querySelector('button[data-testid*="send-button"]'),
      document.querySelector('button[aria-label*="Attach" i]'),
      document.querySelector('button[aria-label*="microphone" i]'),
      document.querySelector('button[aria-label*="voice" i]'),
      document.querySelector('input[type="file"]')
    ].filter(el => el !== null);

    if (elements.length > 0) {
      found = true;
      confidence += 0.4;
      signals.push(`Found ${elements.length} active composer accessory controls`);

      const firstEl = elements[0];
      const isInsideForm = firstEl.closest('form');
      if (isInsideForm) {
        confidence += 0.4;
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
