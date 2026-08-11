/**
 * FocusAI - Usage Tracker Module
 * Handles daily first-open time tracking (Phase 4.1).
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
   * Records first open timestamp for today if not already recorded.
   */
  recordFirstOpenToday: function() {
    return new Promise((resolve) => {
      self.FocusAI.Storage.get('dailyStarts')
        .then((stored) => {
          let dailyStarts = stored || {};
          const today = this.getLocalDateString();
          if (!dailyStarts[today]) {
            dailyStarts[today] = Date.now();
            self.FocusAI.Storage.set('dailyStarts', dailyStarts)
              .then(() => {
                console.log('[FocusAI] First-open time recorded for today:', new Date(dailyStarts[today]).toLocaleTimeString());
                resolve(dailyStarts[today]);
              })
              .catch((err) => {
                console.error('[FocusAI] Error storing first open:', err);
                resolve(null);
              });
          } else {
            resolve(dailyStarts[today]);
          }
        })
        .catch((err) => {
          console.error('[FocusAI] Error reading first open:', err);
          resolve(null);
        });
    });
  },

  /**
   * Calculates Sunday to Saturday daily first opens for the current local week.
   */
  getWeeklyStarts: function() {
    return new Promise((resolve) => {
      self.FocusAI.Storage.get('dailyStarts')
        .then((stored) => {
          const dailyStarts = stored || {};
          const now = new Date();
          const currentDayIndex = now.getDay(); // 0 is Sunday, 6 is Saturday

          const weekDays = [];
          // Calculate starting Sunday of the current week
          const sunday = new Date(now);
          sunday.setDate(now.getDate() - currentDayIndex);

          for (let i = 0; i < 7; i++) {
            const day = new Date(sunday);
            day.setDate(sunday.getDate() + i);
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const dateStr = String(day.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${dateStr}`;

            weekDays.push({
              dayIndex: i, // 0 to 6 (Sun to Sat)
              key: key,
              timestamp: dailyStarts[key] || null
            });
          }

          // Format Week Range (e.g. "Aug 9 — Aug 15" or "Aug 30 — Sep 5")
          const startDay = new Date(sunday);
          const endDay = new Date(sunday);
          endDay.setDate(sunday.getDate() + 6);

          const formatMonthDay = (d) => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[d.getMonth()]} ${d.getDate()}`;
          };

          const rangeStr = `${formatMonthDay(startDay)} — ${formatMonthDay(endDay)}`;

          resolve({
            range: rangeStr,
            days: weekDays
          });
        })
        .catch((err) => {
          console.error('[FocusAI] Error getting weekly starts:', err);
          resolve({ range: "-- — --", days: [] });
        });
    });
  }
};
