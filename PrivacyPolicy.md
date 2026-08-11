# FocusAI - Privacy Policy

**Effective Date:** October 24, 2023

FocusAI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy describes how FocusAI handles your information when you use our Google Chrome extension.

---

### 1. Single Purpose & Description
FocusAI has one primary purpose: to transform ChatGPT into a distraction-free study workspace using a single-click Focus Mode. It is designed locally as a companion for students and learners who want to eliminate visual clutter while using ChatGPT.

### 2. No Data Collection (Local-First Architecture)
FocusAI operates strictly under a **local-first** architecture.
- **No Conversations Accessed or Shared:** We do NOT collect, read, store, or transmit your ChatGPT prompts, responses, uploaded files, or conversation text. All data processing occurs entirely within your local browser.
- **No Telemetry or Tracking:** FocusAI contains no analytics trackers, no telemetry hooks, and no background reporting scripts. There is no remote backend server.

### 3. What Data Is Accessed and Processed
To provide its core workspace features, FocusAI accesses only the minimum local data required:
- **Local DOM Elements:** FocusAI locally accesses and classifies visual elements on active ChatGPT tabs (such as the sidebar, header, and composer) solely to temporarily hide or adjust them when Focus Mode is activated. No data is stored or sent.
- **Chrome Storage:** FocusAI utilizes `chrome.storage.local` purely to persist:
  1. Your current Focus Mode status (`focusEnabled`).
  2. A daily timestamp representing the very first time you opened ChatGPT for each day of the current calendar week (`dailyStarts`).
- **No Unrelated Sites:** FocusAI only requests access and executes on supported ChatGPT hosts (`chatgpt.com` and `chat.openai.com`). It does not run on, or monitor, any other website.

### 4. Data Sharing and Sales
We do not sell, trade, or share any of your data with third parties. Your configuration data never leaves your device.

### 5. Your Choices & Controls
- **Toggle Focus Mode:** You can toggle Focus Mode on or off at any time using the extension popup or the default keyboard shortcut `Ctrl+Shift+F` (or `Command+Shift+F` on macOS).
- **Clear Storage:** You can clear all recorded daily starts or states at any time by uninstalling the extension or clearing your browser's local extension cache.

### 6. Contact Information
For any questions regarding this Privacy Policy or FocusAI, please contact us at:
- **Support Email:** support@focusai.study (placeholder for manual Chrome Web Store submission)
- **Support URL:** https://github.com/user/focusai-chatgpt
