const cron = require("node-cron");

const {
  processWarrantyReminders,
} = require("../services/warrantyReminderServices.js");

// =========================================================
// WARRANTY REMINDER SCHEDULER
// =========================================================

const startWarrantyReminderScheduler =
  () => {
    cron.schedule(
      "0 9 * * *",
      async () => {
        await processWarrantyReminders();
      },
      {
        timezone:
          "Asia/Kolkata",

        noOverlap: true,
      }
    );

    console.log(
      "Warranty reminder scheduler started. Daily check: 09:00 Asia/Kolkata."
    );
  };

module.exports =
  startWarrantyReminderScheduler;