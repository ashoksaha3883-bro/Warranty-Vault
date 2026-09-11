const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../modal/User.js");

const {
  sendLoginConfirmationEmail,
} = require("../services/emailService.js");

// =====================================================
// SECURITY LIMITS
// =====================================================

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

const BCRYPT_ROUNDS = 12;

// ===============================
// REGISTER
// ===============================

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    // =====================================================
    // REQUIRED FIELDS
    // =====================================================

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    // =====================================================
    // NORMALIZE INPUT
    // =====================================================

    const normalizedName =
      String(name).trim();

    const normalizedEmail =
      String(email)
        .toLowerCase()
        .trim();

    const normalizedPassword =
      String(password);

    // =====================================================
    // INPUT LENGTH VALIDATION
    // =====================================================

    if (
      normalizedName.length === 0 ||
      normalizedName.length >
        MAX_NAME_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be between 1 and 100 characters",
      });
    }

    if (
      normalizedEmail.length === 0 ||
      normalizedEmail.length >
        MAX_EMAIL_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address",
      });
    }

    if (
      normalizedPassword.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    if (
      normalizedPassword.length >
      MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must not exceed 128 characters",
      });
    }

    // =====================================================
    // BASIC EMAIL VALIDATION
    // =====================================================

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address",
      });
    }

    // =====================================================
    // CHECK EXISTING USER
    // =====================================================

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this email",
      });
    }

    // =====================================================
    // HASH PASSWORD
    // =====================================================

    const hashedPassword =
      await bcrypt.hash(
        normalizedPassword,
        BCRYPT_ROUNDS
      );

    // =====================================================
    // CREATE USER
    // =====================================================

    const user =
      await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
      });

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "Register Error:",
      error
    );

    // Handles two requests trying
    // to register the same email
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this email",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating account",
    });
  }
};

// ===============================
// LOGIN
// ===============================

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // =====================================================
    // REQUIRED FIELDS
    // =====================================================

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    // =====================================================
    // NORMALIZE INPUT
    // =====================================================

    const normalizedEmail =
      String(email)
        .toLowerCase()
        .trim();

    const normalizedPassword =
      String(password);

    // =====================================================
    // INPUT LENGTH VALIDATION
    // =====================================================

    if (
      normalizedEmail.length === 0 ||
      normalizedEmail.length >
        MAX_EMAIL_LENGTH
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (
      normalizedPassword.length === 0 ||
      normalizedPassword.length >
        MAX_PASSWORD_LENGTH
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // =====================================================
    // FIND USER
    // =====================================================

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // =====================================================
    // COMPARE PASSWORD
    // =====================================================

    const passwordMatch =
      await bcrypt.compare(
        normalizedPassword,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // =====================================================
    // CHECK JWT SECRET
    // =====================================================

    if (
      !process.env.JWT_SECRET
    ) {
      console.error(
        "JWT_SECRET is not configured"
      );

      return res.status(500).json({
        success: false,
        message:
          "Authentication service is not configured",
      });
    }

    // =====================================================
    // CREATE JWT
    // =====================================================

    const token =
      jwt.sign(
        {
          userId: user._id.toString(),
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

    // =====================================================
    // LOGIN EMAIL
    // =====================================================

    sendLoginConfirmationEmail({
      user,
    })
      .then((emailResult) => {
        if (
          !emailResult?.success
        ) {
          console.error(
            "Login confirmation email failed:",
            emailResult?.error ||
              "Unknown email error"
          );
        }
      })
      .catch((emailError) => {
        console.error(
          "Login confirmation email error:",
          emailError?.message ||
            emailError
        );
      });

    // =====================================================
    // LOGIN SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message:
        "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while logging in",
    });
  }
};

// ===============================
// GET CURRENT USER
// ===============================

const getCurrentUser = async (
  req,
  res
) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "Get Current User Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to get current user",
    });
  }
};

// ===============================
// EXPORT
// ===============================

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};