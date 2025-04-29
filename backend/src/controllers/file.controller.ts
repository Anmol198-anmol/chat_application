import { Request, Response } from "express";
import { ProtectedRequest } from "../types/app-request";
import { BadRequestError, InternalError, NotFoundError } from "../core/ApiError";
import { SuccessResponse } from "../core/ApiResponse";
import asyncHandler from "../helpers/asyncHandler";
import fileRepo from "../database/repositories/fileRepo";
import { Types } from "mongoose";
import { serverUrl } from "../config";

// Get file by ID and stream it to the client
export const getFileById = asyncHandler(
  async (req: Request, res: Response) => {
    const { fileId } = req.params;

    if (!fileId) {
      throw new BadRequestError("File ID is required");
    }

    try {
      const { stream, file } = await fileRepo.getFileById(fileId);
      
      // Set appropriate headers
      res.set("Content-Type", file.contentType);
      res.set("Content-Disposition", `inline; filename="${file.metadata.originalName}"`);
      res.set("Cache-Control", "max-age=31536000"); // Cache for 1 year
      
      // Add security headers
      res.set("X-Content-Type-Options", "nosniff");
      
      // Stream the file to the client
      stream.pipe(res);
    } catch (error) {
      throw new NotFoundError("File not found");
    }
  }
);

// Get file metadata
export const getFileMetadata = asyncHandler(
  async (req: Request, res: Response) => {
    const { fileId } = req.params;

    if (!fileId) {
      throw new BadRequestError("File ID is required");
    }

    try {
      const metadata = await fileRepo.getFileMetadata(fileId);
      return new SuccessResponse("File metadata retrieved successfully", metadata).send(res);
    } catch (error) {
      throw new NotFoundError("File not found");
    }
  }
);

// Generate a file URL for the client
export const getFileUrl = (fileId: string): string => {
  return `${serverUrl}/api/files/${fileId}`;
};