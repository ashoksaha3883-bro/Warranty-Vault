const mongoose = require("mongoose");

const warrantySchema = new mongoose.Schema(
  {
    // =========================================
    // USER
    // =========================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================================
    // PRODUCT INFORMATION
    // =========================================

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      trim: true,
      default: "",
    },

    model: {
      type: String,
      trim: true,
      default: "",
    },

    serialNumber: {
      type: String,
      trim: true,
      default: "",
    },

    serialNumbers: {
      type: [String],
      default: [],
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    // =========================================
    // PURCHASE INFORMATION
    // =========================================

    purchaseDate: {
      type: Date,
      default: null,
    },

    purchasePrice: {
      type: Number,
      default: null,
    },

    invoiceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    seller: {
      type: String,
      trim: true,
      default: "",
    },

    contact: {
      type: String,
      trim: true,
      default: "",
    },

    placeOfSupply: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================================
    // WARRANTY INFORMATION
    // =========================================

    warrantyStartDate: {
      type: Date,
      required: true,
    },

    warrantyDuration: {
      type: String,
      default: "",
      trim: true,
    },

    warrantyEndDate: {
      type: Date,
      required: true,
    },

    warrantyType: {
      type: String,
      default: "Warranty",
      trim: true,
    },

    // =========================================
    // DOCUMENT / PRODUCT IMAGE
    // =========================================

    documentUrl: {
      type: String,
      default: "",
    },

    productImageUrl: {
      type: String,
      default: "",
    },

    // =========================================
    // MULTIPLE PRODUCTS
    // =========================================

    products: {
      type: [
        {
          productName: {
            type: String,
            default: "",
          },

          brand: {
            type: String,
            default: "",
          },

          modelNumber: {
            type: String,
            default: "",
          },

          serialNumber: {
            type: String,
            default: "",
          },

          serialNumbers: {
            type: [String],
            default: [],
          },
        },
      ],
      default: [],
    },

    // =========================================
    // WARRANTY STATUS
    // =========================================

    status: {
      type: String,
      enum: [
        "active",
        "expiring",
        "expired",
        "cancelled",
      ],
      default: "active",
    },

    // =========================================
    // EMAIL REMINDERS
    // =========================================

    remindersSent: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// =========================================
// PERFORMANCE INDEXES
// =========================================

// User's warranties, newest first
warrantySchema.index({
  user: 1,
  createdAt: -1,
});

// Warranty reminder/date queries
warrantySchema.index({
  warrantyEndDate: 1,
});

// Helps reminder scheduler filter by status + expiry date
warrantySchema.index({
  status: 1,
  warrantyEndDate: 1,
});

module.exports = mongoose.model(
  "Warranty",
  warrantySchema
);