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

  /**
   * Category Heuristics - CONVERSATION (CONTENT) - Protected (Confidence >= 0.85)
   */
  _classifyConversation: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    // Locate the scroller/parent holding chat turn rows
    const candidates = [
      document.querySelector('.react-scroll-to-bottom--css'),
      document.querySelector('[role="presentation"] .flex-col'),
      document.querySelector('div[data-testid*="conversation-turn"]')?.parentElement,
      document.querySelector('article')?.parentElement,
      document.querySelector('.conversation-container'),
      document.querySelector('main .flex-col')
    ];

    const element = candidates.find(el => el !== null);

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.4;
      signals.push("Located main structural conversation parent");

      // Verify the presence of chat content children (articles or turn blocks)
      const articles = element.querySelectorAll('article');
      const turns = element.querySelectorAll('[data-testid*="conversation-turn"], [data-role], .group');
      const codeBlocks = element.querySelectorAll('pre, code');
      const tables = element.querySelectorAll('table');

      if (articles.length > 0 || turns.length > 0) {
        confidence += 0.3;
        signals.push(`Contains message turns / articles (count: ${articles.length || turns.length})`);
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
  _classifyUserMessages: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;

    // Direct role or testid queries
    let elements = Array.from(document.querySelectorAll('[data-testid*="user-message"], [data-role="user"], div.group[data-role="user"]'));

    // Relative negative-heuristics match: articles that represent chat turns but are user-sourced (no copy button, no .markdown prose)
    if (elements.length === 0) {
      const articles = Array.from(document.querySelectorAll('article'));
      elements = articles.filter(art => {
        const hasCopy = art.querySelector('button[aria-label*="Copy" i]') || art.innerText.toLowerCase().includes("copy response");
        const hasMarkdown = art.querySelector('.markdown, .prose');
        return !hasCopy && !hasMarkdown;
      });
    }

    if (elements.length > 0) {
      found = true;
      tag = "ARTICLE";
      confidence += 0.4;
      signals.push(`Found ${elements.length} user question turns`);

      const firstEl = elements[0];
      const testid = firstEl.getAttribute("data-testid") || "";
      const role = firstEl.getAttribute("data-role") || "";

      if (testid.includes("user") || role === "user") {
        confidence += 0.3;
        signals.push("Matched explicit user turn attributes");
      }

      if (firstEl.tagName === "ARTICLE") {
        confidence += 0.2;
        signals.push("Matched semantic chat message <article> turns");
      }

      // Geolocation right alignment or padding
      const rect = firstEl.getBoundingClientRect();
      if (rect.right > (window.innerWidth / 2)) {
        confidence += 0.1;
        signals.push("Located right-aligned user bubble orientation");
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
      selectorUsed: 'article:not(:has(.markdown))',
      tag: found ? tag : "N/A",
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

    // Direct role/testid queries
    let elements = Array.from(document.querySelectorAll('[data-testid*="assistant-message"], [data-role="assistant"], div.group[data-role="assistant"]'));

    // Structural matches: articles containing markdown or message actions
    if (elements.length === 0) {
      const articles = Array.from(document.querySelectorAll('article'));
      elements = articles.filter(art => {
        const hasCopy = art.querySelector('button[aria-label*="Copy" i], button[aria-label*="response" i]');
        const hasMarkdown = art.querySelector('.markdown, .prose') || art.querySelector('p, pre, table, ul, ol');
        return hasCopy || hasMarkdown;
      });
    }

    if (elements.length > 0) {
      found = true;
      tag = "ARTICLE";
      confidence += 0.4;
      signals.push(`Found ${elements.length} assistant response turns`);

      const firstEl = elements[0];
      const testid = firstEl.getAttribute("data-testid") || "";
      const role = firstEl.getAttribute("data-role") || "";

      if (testid.includes("assistant") || role === "assistant") {
        confidence += 0.3;
        signals.push("Matched explicit assistant turn attributes");
      }

      if (firstEl.querySelector('.markdown, .prose') || firstEl.querySelector('p, pre, table, ul, ol')) {
        confidence += 0.25;
        signals.push("Contains prose learning content (code, tables, lists, text blocks)");
      }

      if (firstEl.tagName === "ARTICLE") {
        confidence += 0.05;
        signals.push("Matched semantic chat message <article> turns");
      }
    }

    return {
      found,
      category: "ASSISTANT_RESPONSES",
      confidence: Math.min(1.0, confidence),
      protected: true,
      futureHideCandidate: false,
      safeCandidate: false,
      signals,
      selectorUsed: 'article:has(.markdown)',
      tag: found ? tag : "N/A",
      dimensions: "N/A"
    };
  },

  /**
   * Category Heuristics - MESSAGE ACTIONS
   */
  _classifyMessageActions: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    // Locale-independent action bars typically located within the assistant article
    const candidates = [
      document.querySelector('button[aria-label*="Copy" i]'),
      document.querySelector('button[aria-label*="Good response" i]'),
      document.querySelector('button[aria-label*="Bad response" i]'),
      document.querySelector('button[aria-label*="Read aloud" i]'),
      document.querySelector('button[aria-label*="Regenerate" i]'),
      document.querySelector('.message-actions-toolbar'),
      // Find button rows at the bottom of assistant message blocks
      document.querySelector('article button[aria-label]')
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
        confidence += 0.35;
        signals.push(`ARIA label matches message action toolbar context ("${ariaLabel}")`);
      }

      const isInsideAssistant = element.closest('[data-role="assistant"]') || element.closest('[data-testid*="assistant"]') || element.closest('article');
      if (isInsideAssistant) {
        confidence += 0.25;
        signals.push("Located adjacent to or nested inside Assistant response block");
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
   * Category Heuristics - DISCLAIMER
   */
  _classifyDisclaimer: function() {
    const signals = [];
    let confidence = 0.0;
    let found = false;
    let selectorUsed = "None";
    let tag = "N/A";
    let dimensions = "N/A";

    // Text-based matching on paragraphs, spans, and divs
    const allParagraphsAndSpans = Array.from(document.querySelectorAll('p, span, div'));
    let element = allParagraphsAndSpans.find(el => {
      if (el.children.length > 2) return false;
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

    // Fallback: look for the bottom-most small muted text element below any forms
    if (!element) {
      const forms = Array.from(document.querySelectorAll('form'));
      if (forms.length > 0) {
        const lastForm = forms[forms.length - 1];
        const elementsBelowForm = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
          if (el.children.length > 0) return false;
          const rect = el.getBoundingClientRect();
          const formRect = lastForm.getBoundingClientRect();
          return rect.top > formRect.bottom && rect.height > 5 && rect.height < 40;
        });
        if (elementsBelowForm.length > 0) {
          element = elementsBelowForm[0];
          signals.push("Located bottom-most small text node below composer form");
        }
      }
    }

    if (element) {
      found = true;
      tag = element.tagName;
      const rect = element.getBoundingClientRect();
      dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

      confidence += 0.4;
      signals.push("Located text-matching/position-matching footer node");

      const text = element.textContent || "";
      if (/mistakes|info|errors|limitations|errores|fehler|tromper/i.test(text)) {
        confidence += 0.35;
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

    // Locate the prompt text input (textarea or contenteditable)
    const textInput = document.querySelector('#prompt-textarea') || document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');

    if (textInput) {
      // Find its closest form parent, presentation container, or surrounding wrapper
      const element = textInput.closest('form') || textInput.closest('div[role="presentation"]') || textInput.parentElement;

      if (element) {
        found = true;
        tag = element.tagName;
        const rect = element.getBoundingClientRect();
        dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`;

        confidence += 0.4;
        signals.push("Located parent composer container of text input");

        if (element.tagName === "FORM") {
          confidence += 0.35;
          signals.push("Constructed as a standard interactive HTML form");
        } else {
          confidence += 0.15;
          signals.push("Container acts as a text input structural presentation box");
        }

        if (rect.top > (window.innerHeight - 350)) {
          confidence += 0.25;
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
