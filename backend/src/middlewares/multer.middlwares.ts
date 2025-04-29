import multer from "multer";

// Use memory storage instead of disk storage
// This will store files in memory as Buffer objects
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: Infinity, // Set the maximum file size to infinity (no limit)
  }
});
