/**
 * FocusAI - Storage Module
 * Abstraction layer over chrome.storage.local to centralize and manage persistent storage access.
 */

self.FocusAI = self.FocusAI || {};

self.FocusAI.Storage = {
  /**
   * Retrieves a value from chrome.storage.local.
   * @param {string} key - The storage key to query.
   * @returns {Promise<any>} A promise resolving to the retrieved value, or null if not found.
   */
  get: function(key) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve(result[key] !== undefined ? result[key] : null);
        });
      } else {
        console.warn('chrome.storage.local is not available. Falling back to memory storage/mock.');
        resolve(null);
      }
    });
  },

  /**
   * Saves a value to chrome.storage.local.
   * @param {string} key - The storage key.
   * @param {any} value - The value to store.
   * @returns {Promise<void>} A promise that resolves when the save operation is complete.
   */
  set: function(key, value) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve();
        });
      } else {
        console.warn('chrome.storage.local is not available.');
        resolve();
      }
    });
  },

  /**
   * Deletes a key-value pair from chrome.storage.local.
   * @param {string} key - The key to remove.
   * @returns {Promise<void>} A promise that resolves when the removal operation is complete.
   */
  remove: function(key) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve();
        });
      } else {
        console.warn('chrome.storage.local is not available.');
        resolve();
      }
    });
  },

  /**
   * Clears all stored data from chrome.storage.local.
   * @returns {Promise<void>} A promise that resolves when the storage is cleared.
   */
  clear: function() {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve();
        });
      } else {
        console.warn('chrome.storage.local is not available.');
        resolve();
      }
    });
  }
};
