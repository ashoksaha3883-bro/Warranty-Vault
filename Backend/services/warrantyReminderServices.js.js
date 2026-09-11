const Warranty =
  require("../modal/Warrenty.js");

const {
  sendWarrantyReminder,
} = require("./emailService.js");

// =========================================================
// CONSTANTS
// =========================================================

const DAY_MS =
  1000 *
  60 *
  60 *
  24;

const DAY_REMINDERS = [
  20,
  10,
  5,
  2,
  1,
];

// =========================================================
// GET DAYS LEFT
// =========================================================

const getDaysLeft = (
  endDate
) => {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const end =
    new Date(endDate);

  end.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      end.getTime() -
      today.getTime()
    ) / DAY_MS
  );
};

// =========================================================
// GET YEAR + MONTHS LEFT
// =========================================================

const getTimeRemaining = (
  endDate
) => {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const end =
    new Date(endDate);

  end.setHours(
    0,
    0,
    0,
    0
  );

  let years =
    end.getFullYear() -
    today.getFullYear();

  let months =
    end.getMonth() -
    today.getMonth();

  if (
    end.getDate() <
    today.getDate()
  ) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 0) {
    years = 0;
    months = 0;
  }

  return {
    years,
    months,
  };
};

// =========================================================
// GET MONTHS LEFT
// =========================================================

const getMonthsLeft = (
  endDate
) => {
  const {
    years,
    months,
  } =
    getTimeRemaining(
      endDate
    );

  return (
    years * 12 +
    months
  );
};

// =========================================================
// FORMAT MONTHLY REMINDER TEXT
// =========================================================

const formatMonthlyReminderText =
  (
    endDate
  ) => {
    const {
      years,
      months,
    } =
      getTimeRemaining(
        endDate
      );

    if (
      years > 0 &&
      months > 0
    ) {
      return {
        text:
          `${years} ${
            years === 1
              ? "year"
              : "years"
          } ${months} ${
            months === 1
              ? "month"
              : "months"
          }`,

        key:
          `${years}-year-${months}-month`,
      };
    }

    if (years > 0) {
      return {
        text:
          `${years} ${
            years === 1
              ? "year"
              : "years"
          }`,

        key:
          `${years}-year`,
      };
    }

    if (months > 0) {
      return {
        text:
          `${months} ${
            months === 1
              ? "month"
              : "months"
          }`,

        key:
          `${months}-month`,
      };
    }

    return null;
  };

// =========================================================
// FIND DAILY REMINDER
// =========================================================

const findDailyReminder =
  (
    daysLeft,
    remindersSent
  ) => {
    for (
      const reminderDay
        of DAY_REMINDERS
    ) {
      if (
        daysLeft <=
        reminderDay
      ) {
        const key =
          `${reminderDay}-day`;

        if (
          !remindersSent.includes(
            key
          )
        ) {
          return {
            key,
            text:
              reminderDay === 1
                ? "1 day"
                : `${reminderDay} days`,
          };
        }
      }
    }

    return null;
  };

// =========================================================
// FIND REMINDER
// =========================================================

const getReminder = (
  daysLeft,
  endDate,
  remindersSent = []
) => {
  const sent =
    Array.isArray(
      remindersSent
    )
      ? remindersSent
      : [];

  // ========================================
  // EXPIRED
  // ========================================

  if (
    daysLeft < 0
  ) {
    return null;
  }

  // ========================================
  // EXPIRES TODAY
  // ========================================

  if (
    daysLeft === 0
  ) {
    if (
      !sent.includes(
        "0-day"
      )
    ) {
      return {
        key: "0-day",
        text:
          "expires today",
      };
    }

    return null;
  }

  // ========================================
  // DAILY REMINDERS
  // ========================================

  if (
    daysLeft <= 20
  ) {
    return findDailyReminder(
      daysLeft,
      sent
    );
  }

  // ========================================
  // MONTHLY REMINDERS
  // ========================================

  const monthly =
    formatMonthlyReminderText(
      endDate
    );

  if (
    monthly &&
    !sent.includes(
      monthly.key
    )
  ) {
    return monthly;
  }

  return null;
};

// =========================================================
// GET WARRANTY STATUS
// =========================================================

const getWarrantyStatus = (
  daysLeft
) => {
  if (
    daysLeft < 0
  ) {
    return "expired";
  }

  if (
    daysLeft <= 20
  ) {
    return "expiring";
  }

  return "active";
};

// =========================================================
// UPDATE WARRANTY STATUS
// =========================================================

const updateWarrantyStatus =
  async (
    warranty,
    daysLeft
  ) => {
    const status =
      getWarrantyStatus(
        daysLeft
      );

    if (
      warranty.status ===
      status
    ) {
      return false;
    }

    await Warranty.updateOne(
      {
        _id:
          warranty._id,

        status: {
          $ne:
            status,
        },
      },
      {
        $set: {
          status,
        },
      }
    );

    warranty.status =
      status;

    return true;
  };

// =========================================================
// SAVE REMINDER
// =========================================================

const saveReminder =
  async (
    warrantyId,
    reminderKey
  ) => {
    const result =
      await Warranty.updateOne(
        {
          _id:
            warrantyId,

          remindersSent: {
            $ne:
              reminderKey,
          },
        },
        {
          $addToSet: {
            remindersSent:
              reminderKey,
          },
        }
      );

    return (
      result.modifiedCount >
      0
    );
  };

// =========================================================
// PROCESS SINGLE WARRANTY
// =========================================================

const processSingleWarranty =
  async (
    warranty
  ) => {
    try {
      const user =
        warranty.user;

      if (!user) {
        return false;
      }

      // Email reminders disabled
      if (
        user.emailNotificationsEnabled !==
        true
      ) {
        return false;
      }

      const daysLeft =
        getDaysLeft(
          warranty.warrantyEndDate
        );

      // Update status
      await updateWarrantyStatus(
        warranty,
        daysLeft
      );

      // Find reminder
      const reminder =
        getReminder(
          daysLeft,
          warranty.warrantyEndDate,
          warranty.remindersSent
        );

      if (!reminder) {
        return false;
      }

      console.log(
        `Sending ${reminder.key} reminder to ${user.email}`
      );

      await sendWarrantyReminder({
        user,
        warranty,
        reminderType:
          reminder.key,
        remainingText:
          reminder.text,
      });

      await saveReminder(
        warranty._id,
        reminder.key
      );

      console.log(
        `Reminder sent successfully: ${reminder.key}`
      );

      return true;
    } catch (error) {
      console.error(
        `Failed processing warranty ${warranty._id}:`,
        error.message
      );

      return false;
    }
  };

// =========================================================
// PROCESS ALL WARRANTY REMINDERS
// =========================================================

const processWarrantyReminders =
  async () => {
    try {
      console.log(
        "Running warranty reminder check..."
      );

      const warranties =
        await Warranty.find({
          warrantyEndDate: {
            $exists:
              true,

            $ne:
              null,
          },
        })
          .select(
            "_id user productName brand warrantyEndDate status remindersSent"
          )
          .populate(
            "user",
            "name email emailNotificationsEnabled"
          );

      console.log(
        `Checking ${warranties.length} warranties`
      );

      let sentCount =
        0;

      for (
        const warranty
          of warranties
      ) {
        const sent =
          await processSingleWarranty(
            warranty
          );

        if (sent) {
          sentCount++;
        }
      }

      console.log(
        `Warranty reminder check completed. Emails sent: ${sentCount}`
      );

      return {
        success:
          true,

        checked:
          warranties.length,

        emailsSent:
          sentCount,
      };
    } catch (error) {
      console.error(
        "Warranty reminder service error:",
        error
      );

      return {
        success:
          false,

        checked:
          0,

        emailsSent:
          0,
      };
    }
  };

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  processWarrantyReminders,
  getDaysLeft,
  getMonthsLeft,
  getReminder,
};