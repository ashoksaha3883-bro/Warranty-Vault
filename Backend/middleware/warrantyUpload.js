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
    fileSize: 50 * 1024 * 1024,
    files: 1,
    fields: 20,
    fieldSize: 100 * 1024,
  },

  fileFilter,
});

module.exports = upload;