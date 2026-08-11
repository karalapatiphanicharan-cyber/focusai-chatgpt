# FocusAI

Turn ChatGPT into your distraction-free study workspace with a single click.

FocusAI is a local-first, lightweight Google Chrome extension built strictly using Manifest V3 and vanilla HTML, CSS, and JavaScript. It transforms the ChatGPT interface into a clean, focused environment optimized for learning and study, while preserving all your valuable conversation content.

---

## Key Features

- **Focus Mode:** Temporarily hides all non-essential ChatGPT interface elements (sidebar, header bar, footer disclaimer, and composer) to remove distractions.
- **Wider reading width:** Automatically expands the conversation container layout up to 950px to make better use of the available screen space.
- **Ask New Question:** Displays the real ChatGPT composer input, focusing it instantly and scrolling smoothly to let you write your next question.
- **Native Fullscreen:** Switch into the browser's native fullscreen mode directly from the FocusAI floating controls for an ultra-immersive study session.
- **Keyboard Shortcut:** Toggle Focus Mode instantly using `Ctrl+Shift+F` (or `Command+Shift+F` on macOS) without hijacking page elements or interfering with ChatGPT shortcuts.
- **Weekly Usage Tracking:** A dynamic, read-only Weekly starts dashboard showing the timestamp of the first time you opened ChatGPT on each day of the current week (Sunday to Saturday).
- **100% Local-First Privacy:** No prompts, responses, files, or browsing data are collected, tracked, or sent to any server. No external network requests are made.

---

## Project Architecture

```
FocusAI/
├── background/
│   └── service-worker.js       # Listens to tabs, window focus, storage, and keyboard shortcuts
├── content/
│   └── content.js              # Handshakes with service worker and coordinates Focus Mode toggling
├── core/
│   ├── focus/
│   │   └── focus-engine.js     # Classifies elements, handles hiding/restoring, and implements observer
│   ├── messaging/
│   │   └── messages.js         # Constant message type definitions
│   ├── platform/
│   │   └── chatgpt.js          # URL matching heuristics for supported ChatGPT pages
│   ├── storage/
│   │   └── storage.js          # Promise-based wrapper around chrome.storage.local
│   └── usage/
│       └── usage-tracker.js    # Logic for recording daily starts and calculating weekly history
├── icons/
│   └── icon*.png               # Custom geometric extension icons (16px, 32px, 48px, 128px)
└── popup/
    ├── popup.html              # Clean extension popup markup
    ├── popup.css               # Extension custom dark theme styles
    └── popup.js                # Handles platform detection, state sync, and usage view rendering
```

---

## Local Development & Installation

Follow these steps to load and test FocusAI locally in your Google Chrome browser:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/user/focusai-chatgpt.git
   cd focusai-chatgpt
   ```

2. **Load the Extension in Chrome:**
   - Open Google Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** by toggling the switch in the top-right corner.
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `focusai-chatgpt` root directory containing `manifest.json`.

3. **Verify Installation:**
   - Pin the FocusAI icon to your browser toolbar.
   - Open [https://chatgpt.com/](https://chatgpt.com/) or [https://chat.openai.com/](https://chat.openai.com/).
   - Click the FocusAI icon to verify that "Detected" state is displayed and toggles are available.

---

## Keyboard Shortcuts

- **Toggle Focus Mode:** `Ctrl + Shift + F` (or `Command + Shift + F` on macOS)
  - You can customize this shortcut at any time by navigating to `chrome://extensions/shortcuts` in Google Chrome.

---

## Production Packaging

To compile a clean package zip for submitting to the Chrome Web Store:
1. Run our packaging utility:
   ```bash
   python3 /home/jules/self_created_tools/package_release.py
   ```
2. The script will automatically validate the manifest schema, check for key release requirements, and output `focusai-release-v1.0.0.zip` ready for Chrome Developer Dashboard upload.

---

## Privacy Summary
FocusAI does not collect, track, or share any personal information, ChatGPT prompts, or conversation text. All operations are processed strictly locally in your browser. Stored usage history is saved exclusively within `chrome.storage.local` on your local device.
