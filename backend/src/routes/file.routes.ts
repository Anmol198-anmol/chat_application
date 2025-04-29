import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares";
import { getFileById, getFileMetadata } from "../controllers/file.controller";
import { mongoIdPathValidator } from "../validators/mongoId.validator";
import { validate } from "../validators/validate";

const router = Router();

// Protected routes first
// Get file metadata - requires authentication
router.get(
  "/metadata/:fileId",
  verifyJWT,
  mongoIdPathValidator("fileId"),
  validate,
  getFileMetadata
);

// Public route for file access
// Get file by ID - no authentication required for direct file access
router.get(
  "/:fileId",
  mongoIdPathValidator("fileId"),
  validate,
  getFileById
);

export default router;