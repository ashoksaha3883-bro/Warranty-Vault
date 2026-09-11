const multer = require("multer");

const storage = multer.memoryStorage();

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const fileFilter = (req, file, cb) => {
  if (allowedTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Only JPG, PNG, WEBP images and PDF files are supported."
    ),
    false
  );
};

const upload = multer({
  storage,

  limits: {
    // Maximum uploaded file size: 10 MB
    fileSize: 10 * 1024 * 1024,

    // Only one warranty document per scan request
    files: 1,

    // Prevent excessive multipart fields
    fields: 20,

    // Prevent excessively large field values
    fieldSize: 100 * 1024,
  },

  fileFilter,
});

module.exports = upload;