const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(new ApiError(400, 'Solo se permiten imágenes JPG, PNG o WEBP'));
    return;
  }
  cb(null, true);
}

// One multer instance per uploads subfolder (avatars, logos, portfolio, ...) — each
// stores under uploads/<subfolder>/ with a random filename, matching what's already
// served statically from /uploads in server.js.
function createImageUploader(subfolder) {
  const destination = path.join(__dirname, '..', '..', 'uploads', subfolder);
  fs.mkdirSync(destination, { recursive: true });

  const storage = multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
      const ext = ALLOWED_MIME_TYPES[file.mimetype];
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  return multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
}

module.exports = { createImageUploader };
