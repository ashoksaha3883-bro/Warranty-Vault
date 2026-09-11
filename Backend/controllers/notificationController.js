const User = require("../modal/User.js");

// =========================================
// GET NOTIFICATION SETTINGS
// =========================================

const getNotificationSettings = async (
  req,
  res
) => {
  try {
    return res.status(200).json({
      success: true,

      notifications: {
        email:
          req.user.emailNotificationsEnabled !==
          false,
      },
    });
  } catch (error) {
    console.error(
      "Get Notification Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to get notification settings",
    });
  }
};

// =========================================
// UPDATE EMAIL NOTIFICATION
// =========================================

const updateEmailNotifications = async (
  req,
  res
) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "enabled must be true or false",
      });
    }

    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          emailNotificationsEnabled:
            enabled,
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(
        "emailNotificationsEnabled"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        enabled
          ? "Email reminders enabled"
          : "Email reminders disabled",

      notifications: {
        email:
          user.emailNotificationsEnabled,
      },
    });
  } catch (error) {
    console.error(
      "Update Notification Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update notification settings",
    });
  }
};

module.exports = {
  getNotificationSettings,
  updateEmailNotifications,
};