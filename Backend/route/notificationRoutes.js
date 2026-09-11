const express = require("express");

const {
  getNotificationSettings,
  updateEmailNotifications,
} = require("../controllers/notificationController.js");

const protect = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get(
  "/",
  protect,
  getNotificationSettings
);

router.patch(
  "/email",
  protect,
  updateEmailNotifications
);

module.exports = router;