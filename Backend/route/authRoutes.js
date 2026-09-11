const express = require("express");
const {
  rateLimit,
  ipKeyGenerator,
} = require("express-rate-limit");

const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require("../controllers/authController.js");

const protect = require("../middleware/authMiddleware.js");

const router = express.Router();

// =====================================================
// REGISTER RATE LIMIT
// Protects registration from automated account creation
// =====================================================

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip);
  },

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message:
        "Too many registration attempts. Please try again later.",
    });
  },
});

// =====================================================
// LOGIN IP RATE LIMIT
// Protects against attacks coming repeatedly
// from the same IP address.
// =====================================================

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip);
  },

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message:
        "Too many login attempts. Please try again later.",
    });
  },
});

// =====================================================
// LOGIN ACCOUNT RATE LIMIT
// Protects one account from distributed attacks.
// =====================================================

const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: false,
  legacyHeaders: false,

  keyGenerator: (req) => {
    const email = String(
      req.body?.email || ""
    )
      .toLowerCase()
      .trim();

    return email
      ? `account:${email}`
      : `account:unknown`;
  },

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message:
        "Too many login attempts. Please try again later.",
    });
  },
});

// =====================================================
// REGISTER
// =====================================================

router.post(
  "/register",
  registerLimiter,
  registerUser
);

// =====================================================
// LOGIN
// =====================================================

router.post(
  "/login",
  loginIpLimiter,
  loginAccountLimiter,
  loginUser
);

// =====================================================
// GET CURRENT USER
// =====================================================

router.get(
  "/me",
  protect,
  getCurrentUser
);

module.exports = router;