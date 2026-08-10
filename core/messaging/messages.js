/**
 * FocusAI - Messaging Contract Definitions
 * Defines standard constant message types for communication between Popup, Service Worker, and Content Script.
 */

self.FocusAI = self.FocusAI || {};

self.FocusAI.Messaging = {
  Types: {
    GET_PLATFORM_STATUS: "GET_PLATFORM_STATUS",
    PLATFORM_STATUS: "PLATFORM_STATUS",
    GET_FOCUS_STATE: "GET_FOCUS_STATE",
    FOCUS_MODE_ON: "FOCUS_MODE_ON",
    FOCUS_MODE_OFF: "FOCUS_MODE_OFF",
    FOCUS_STATE_CHANGED: "FOCUS_STATE_CHANGED",
    GET_USAGE_DATA: "GET_USAGE_DATA",
    USAGE_DATA: "USAGE_DATA",
    GET_SETTINGS: "GET_SETTINGS",
    SET_SETTINGS: "SET_SETTINGS"
  }
};
