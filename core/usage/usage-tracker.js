/**
 * FocusAI - Usage Tracker Module
 * Interface for measuring active ChatGPT session duration.
 */

self.FocusAI = self.FocusAI || {};

self.FocusAI.UsageTracker = {
  /**
   * Gets local date string "YYYY-MM-DD" according to local timezone.
   */
  getLocalDateString: function() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  },

  /**
   * Retrieves today's accumulated active usage.
   */
  getTodayUsage: function() {
    return new Promise((resolve) => {
      self.FocusAI.Storage.get('dailyUsage')
        .then((stored) => {
          let dailyUsage = stored || {};
          const today = this.getLocalDateString();

          if (!dailyUsage[today]) {
            dailyUsage[today] = {
              startedAt: null,
              totalActiveSeconds: 0,
              sessions: 0
            };
          }
          resolve({
            success: true,
            implemented: true,
            date: today,
            startedAt: dailyUsage[today].startedAt,
            totalActiveSeconds: dailyUsage[today].totalActiveSeconds,
            sessions: dailyUsage[today].sessions
          });
        })
        .catch((err) => {
          console.error('[FocusAI] Error loading usage record:', err);
          resolve({
            success: false,
            implemented: false,
            totalActiveSeconds: 0,
            sessions: 0,
            startedAt: null
          });
        });
    });
  },

  /**
   * Dynamic local date reset / check.
   */
  checkAndResetToday: function() {
    return new Promise((resolve) => {
      self.FocusAI.Storage.get('dailyUsage')
        .then((stored) => {
          let dailyUsage = stored || {};
          const today = this.getLocalDateString();
          let modified = false;

          if (!dailyUsage[today]) {
            dailyUsage[today] = {
              startedAt: null,
              totalActiveSeconds: 0,
              sessions: 0
            };
            modified = true;
          }

          if (modified) {
            self.FocusAI.Storage.set('dailyUsage', dailyUsage)
              .then(() => resolve(dailyUsage[today]))
              .catch(() => resolve(dailyUsage[today]));
          } else {
            resolve(dailyUsage[today]);
          }
        })
        .catch(() => {
          resolve({
            startedAt: null,
            totalActiveSeconds: 0,
            sessions: 0
          });
        });
    });
  }
};
