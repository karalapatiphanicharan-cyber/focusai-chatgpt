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
   * Safe ChatGPT UI Discovery & Element Classification (PHASE -2 CORRECTED)
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

    // First, classify message turns to help with userMessages and assistantResponses
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

    // 100% correct, locale-independent, and precise identification:
    // For each assistant response turn, query all button elements that are OUTSIDE the main markdown/prose content block!
    const actionButtons = [];
    if (assistantTurns && assistantTurns.length > 0) {
      assistantTurns.forEach(art => {
        const buttons = Array.from(art.querySelectorAll('button'));
        buttons.forEach(btn => {
          // Filter out buttons located inside the markdown/prose body
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

    // Fallback position tracking: find elements below the last form (which represents the composer)
    if (!element) {
      const forms = Array.from(document.querySelectorAll('form'));
      if (forms.length > 0) {
        const lastForm = forms[forms.length - 1];
        const elementsBelowForm = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
          if (el.children.length > 0) return false;
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
