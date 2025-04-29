import { Types } from "mongoose";
import { Readable } from "stream";
import { bucket } from "../model/File";
import { InternalError } from "../../core/ApiError";
import colorsUtils from "../../helpers/colorsUtils";

// Upload a file to GridFS from a buffer
const uploadFileFromBuffer = async (
  fileBuffer: Buffer,
  filename: string,
  contentType: string,
  userId: Types.ObjectId,
  originalName: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create a readable stream from the buffer
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);

    // Create an upload stream to GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        originalName,
        uploadedBy: userId,
      },
    });

    // Handle upload errors
    uploadStream.on("error", (error) => {
      colorsUtils.log("error", `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      reject(new InternalError("Failed to upload file"));
    });

    // Handle upload completion
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString());
    });

    // Pipe the readable stream to the upload stream
    readableStream.pipe(uploadStream);
  });
};

// Upload a file to GridFS from a stream
const uploadFileFromStream = async (
  readableStream: NodeJS.ReadableStream,
  filename: string,
  contentType: string,
  fileSize: number,
  userId: Types.ObjectId,
  originalName: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create an upload stream to GridFS with a larger chunk size for better performance with large files
    // Default chunk size is 255KB, we'll use 1MB for large files
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      chunkSizeBytes: 1024 * 1024, // 1MB chunks
      metadata: {
        originalName,
        uploadedBy: userId,
        size: fileSize
      },
    });

    // Track upload progress
    let bytesUploaded = 0;
    const startTime = Date.now();
    
    // Handle read stream errors
    readableStream.on("error", (error) => {
      colorsUtils.log("error", `Error reading file stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
      reject(new InternalError("Failed to read file stream"));
    });

    // Handle upload errors
    uploadStream.on("error", (error) => {
      colorsUtils.log("error", `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      reject(new InternalError("Failed to upload file"));
    });

    // Handle upload completion
    uploadStream.on("finish", () => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // in seconds
      const speedMBps = (fileSize / (1024 * 1024)) / duration;
      
      colorsUtils.log(
        "info", 
        `File upload complete: ${originalName} (${(fileSize / (1024 * 1024)).toFixed(2)}MB) in ${duration.toFixed(2)}s at ${speedMBps.toFixed(2)}MB/s`
      );
      
      resolve(uploadStream.id.toString());
    });

    // Log progress for very large files
    if (fileSize > 100 * 1024 * 1024) { // For files larger than 100MB
      readableStream.on("data", (chunk) => {
        bytesUploaded += chunk.length;
        const progress = Math.round((bytesUploaded / fileSize) * 100);
        
        // Log progress every 10%
        if (progress % 10 === 0) {
          colorsUtils.log("info", `Uploading ${originalName}: ${progress}% complete`);
        }
      });
    }

    // Pipe the readable stream to the upload stream
    readableStream.pipe(uploadStream);
  });
};

// Main upload function that delegates to the appropriate method
const uploadFile = async (
  fileBufferOrStream: Buffer | NodeJS.ReadableStream,
  filename: string,
  contentType: string,
  userId: Types.ObjectId,
  originalName: string,
  fileSize?: number
): Promise<string> => {
  if (Buffer.isBuffer(fileBufferOrStream)) {
    return uploadFileFromBuffer(fileBufferOrStream, filename, contentType, userId, originalName);
  } else if (fileSize !== undefined) {
    return uploadFileFromStream(fileBufferOrStream, filename, contentType, fileSize, userId, originalName);
  } else {
    throw new InternalError("Invalid file upload parameters");
  }
};

// Get a file from GridFS by ID
const getFileById = async (fileId: string): Promise<{
  stream: NodeJS.ReadableStream;
  file: any;
}> => {
  try {
    // Find the file metadata
    const files = await bucket.find({ _id: new Types.ObjectId(fileId) }).toArray();
    
    if (!files || files.length === 0) {
      throw new InternalError("File not found");
    }

    // Get the file stream
    const downloadStream = bucket.openDownloadStream(new Types.ObjectId(fileId));
    
    return {
      stream: downloadStream,
      file: files[0],
    };
  } catch (error) {
    colorsUtils.log("error", `Error retrieving file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new InternalError("Failed to retrieve file");
  }
};

// Delete a file from GridFS
const deleteFile = async (fileId: string): Promise<boolean> => {
  try {
    await bucket.delete(new Types.ObjectId(fileId));
    return true;
  } catch (error) {
    colorsUtils.log("error", `Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new InternalError("Failed to delete file");
  }
};

// Get file metadata by ID
const getFileMetadata = async (fileId: string): Promise<any> => {
  try {
    const files = await bucket.find({ _id: new Types.ObjectId(fileId) }).toArray();
    
    if (!files || files.length === 0) {
      throw new InternalError("File not found");
    }
    
    return files[0];
  } catch (error) {
    colorsUtils.log("error", `Error retrieving file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new InternalError("Failed to retrieve file metadata");
  }
};

// Find a file by its MD5 hash (to detect duplicates)
const findFileByHash = async (md5Hash: string): Promise<string | null> => {
  try {
    // Find the file by MD5 hash
    const files = await bucket.find({ md5: md5Hash }).toArray();
    
    if (!files || files.length === 0) {
      return null;
    }
    
    // Return the file ID if found
    return files[0]._id.toString();
  } catch (error) {
    colorsUtils.log("error", `Error finding file by hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

// Calculate MD5 hash of a file buffer
const calculateMD5 = (buffer: Buffer): string => {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(buffer).digest('hex');
};

// Find duplicate file by content hash
const findDuplicateFile = async (fileBuffer: Buffer): Promise<string | null> => {
  try {
    // Calculate MD5 hash of the file
    const md5Hash = calculateMD5(fileBuffer);
    
    // Find file by hash
    return await findFileByHash(md5Hash);
  } catch (error) {
    colorsUtils.log("error", `Error finding duplicate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

export default {
  uploadFile,
  getFileById,
  deleteFile,
  getFileMetadata,
  findDuplicateFile,
};