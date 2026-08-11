# FocusAI - Release Candidate Checklist

This checklist documents the final release readiness and manual verification status for FocusAI (version 1.0.0).

## PRODUCT & METADATA
- [x] **FocusAI** name finalized
- [x] **Logo** finalized (geometric F + target ring exported to 16x16, 32x32, 48x48, 128x128 px PNGs)
- [x] **Tagline** finalized: *"ChatGPT, without the distractions."*
- [x] **Description** finalized: *"Turn ChatGPT into a distraction-free study workspace with Focus Mode, fullscreen study tools, and weekly usage tracking."*

## CORE FUNCTIONALITY
- [x] **ChatGPT Detection:** Correctly identifies active tab domains (`chatgpt.com` and `chat.openai.com`) and disables control toggles on non-ChatGPT domains.
- [x] **Focus Mode:** Hides unnecessary ChatGPT elements (sidebar, header, composer initially, disclaimer) while keeping conversation fully visible.
- [x] **Ask New Question:** Displays real ChatGPT composer, scrolls smoothly to the bottom, and focuses the composer textarea.
- [x] **Exit Focus:** Restores original ChatGPT layout, removes the floating controls panel, and exits browser fullscreen if active.
- [x] **Disclaimer Removal:** Entirely hides the footer disclaimer during Focus Mode.
- [x] **Protected Content:** Preserves user messages, assistant responses, code blocks, images, tables, and generated content.

## FULLSCREEN & POLISH
- [x] **Native Fullscreen:** Clicking "Enter Fullscreen" requests native browser fullscreen on the document root.
- [x] **Exit Fullscreen:** Correctly exits fullscreen when toggled, when Focus Mode is deactivated, or when the user presses `ESC`.
- [x] **Workspace Width:** Automatically adjusts high-confidence conversation element max-width (to 950px) for optimal study spacing.
- [x] **Original Styles Restoration:** Backs up all modified properties (`maxWidth`, `margin`, `padding`, `width`, `display`, etc.) and fully restores them on deactivate.

## KEYBOARD SHORTCUT
- [x] **Shortcut Trigger:** `Ctrl + Shift + F` (or `Command + Shift + F` on macOS) successfully toggles Focus Mode.
- [x] **Platform Scope:** Toggles Focus Mode state only when active tab is a supported ChatGPT domain; has no side-effects on other websites.
- [x] **No Page Hijack:** Implemented exclusively through Chrome Commands API. No keydown or keyup event listeners are attached to the ChatGPT page.

## QUALITY, COMPLIANCE & SECURITY
- [x] **No Remote Code:** Extension is completely self-contained. No external scripts are fetched, and `eval()` is never used.
- [x] **No Telemetry or Analytics:** 100% private. No prompts, responses, or browsing data are collected or sent.
- [x] **Minimum Permissions:** Requests only `activeTab` and `storage` permissions.
- [x] **SPA Navigation & Lifecycle:** Handled cleanly via event-driven broadcast state changes and a non-looping `MutationObserver`.
- [x] **No Console Noise:** Clean debugging. Suppresses context-invalidated messages and observer target errors.
- [x] **Production ZIP Package:** Contains only mandatory asset and code paths, completely omitting `node_modules`, `.git`, or temporary files.
