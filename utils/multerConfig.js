const multer = require('multer');

// Define storage for the uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Uploads directory
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Initialize multer with the defined storage
const upload = multer({ storage: storage });

module.exports = upload;