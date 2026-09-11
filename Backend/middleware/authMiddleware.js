const jwt = require("jsonwebtoken");
const User = require("../modal/User.js");

const protect = async (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    // =========================================
    // CHECK AUTHORIZATION HEADER
    // =========================================

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // =========================================
    // GET TOKEN
    // =========================================

    const token =
      authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // =========================================
    // VERIFY TOKEN
    // =========================================

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    // =========================================
    // FIND USER
    // =========================================
    //
    // Only load fields currently needed by
    // protected backend features.
    //

    const user =
      await User.findById(
        decoded.userId
      ).select(
        "_id name email emailNotificationsEnabled"
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // =========================================
    // ATTACH USER
    // =========================================

    req.user = user;

    next();
  } catch (error) {
    // Authentication failures are expected when
    // tokens are expired/invalid, so don't expose
    // internal error details to the client.

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token",
    });
  }
};

module.exports = protect;