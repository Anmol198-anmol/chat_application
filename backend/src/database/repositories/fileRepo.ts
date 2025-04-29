import { Types } from "mongoose";
import { Readable } from "stream";
import { bucket } from "../model/File";
import { InternalError } from "../../core/ApiError";
import colorsUtils from "../../helpers/colorsUtils";

// Upload a file to GridFS
const uploadFile = async (
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
      colorsUtils.log("error", `Error uploading file: ${error.message}`);
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

export default {
  uploadFile,
  getFileById,
  deleteFile,
  getFileMetadata,
};