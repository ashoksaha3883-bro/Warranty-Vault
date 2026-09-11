const express = require("express");

const {
  scanWarranty,
  createWarranty,
  getMyWarranties,
} = require("../controllers/warrantyController.js");

const protect = require("../middleware/authMiddleware.js");

const warrantyUpload = require("../middleware/warrantyUpload.js");

const router = express.Router();

/*
============================================================
SCAN WARRANTY
============================================================
POST /api/warranty/scan
*/
router.post(
  "/scan",
  warrantyUpload.single("warranty"),
  scanWarranty
);

/*
============================================================
GET MY WARRANTIES
============================================================
GET /api/warranty
*/
router.get(
  "/",
  protect,
  getMyWarranties
);

/*
============================================================
CREATE WARRANTY
============================================================
POST /api/warranty
*/
router.post(
  "/",
  protect,
  createWarranty
);

module.exports = router;