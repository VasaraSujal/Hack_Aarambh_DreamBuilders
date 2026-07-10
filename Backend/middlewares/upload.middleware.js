import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Get file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Allowed file extensions (more reliable than MIME types)
  const allowedExtensions = [
    ".mp3",
    ".wav",
    ".webm",
    ".mp4",
    ".ogg",
    ".m4a",
    ".flac",
    ".aac",
  ];

  console.log("📁 File Upload Debug:");
  console.log("  Original name:", file.originalname);
  console.log("  MIME type:", file.mimetype);
  console.log("  Extension:", fileExtension);

  if (allowedExtensions.includes(fileExtension)) {
    console.log("  ✅ File accepted");
    cb(null, true);
  } else {
    console.log("  ❌ File rejected - extension not allowed");
    cb(new Error(`Unsupported format. Allowed types: ${allowedExtensions.join(", ")}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export default upload;
