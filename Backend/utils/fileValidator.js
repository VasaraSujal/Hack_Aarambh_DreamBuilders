// File validation utility functions

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp3",
  "audio/webm",
  "audio/mp4",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export const isValidAudioType = (mimeType) => {
  return ALLOWED_AUDIO_TYPES.includes(mimeType);
};

export const isValidFileSize = (fileSize) => {
  return fileSize <= MAX_FILE_SIZE;
};

export const getFileExtension = (fileName) => {
  return fileName.split(".").pop();
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const validateAudioFile = (file) => {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (!isValidAudioType(file.mimetype)) {
    return { valid: false, error: "Unsupported audio format" };
  }

  if (!isValidFileSize(file.size)) {
    return { valid: false, error: `File size exceeds ${formatFileSize(MAX_FILE_SIZE)}` };
  }

  return { valid: true };
};
