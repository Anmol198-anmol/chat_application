import { Schema, Types, model } from "mongoose";
import mongoose from "mongoose";
import { connection } from "..";

export const DOCUMENT_NAME = "File";

export default interface File {
  _id: Types.ObjectId;
  filename: string;
  contentType: string;
  size: number;
  uploadDate: Date;
  metadata: {
    originalName: string;
    uploadedBy: Types.ObjectId;
  };
}

// Create a GridFS bucket for file storage
// We'll initialize the bucket after the connection is established
let _bucket: mongoose.mongo.GridFSBucket;

// Function to get or create the bucket
export const getBucket = (): mongoose.mongo.GridFSBucket => {
  if (!_bucket) {
    if (!connection.db) {
      throw new Error('Database connection not established');
    }
    _bucket = new mongoose.mongo.GridFSBucket(connection.db, {
      bucketName: "files"
    });
  }
  return _bucket;
};

// For backward compatibility
export const bucket = {
  openUploadStream: (filename: string, options?: any) => getBucket().openUploadStream(filename, options),
  openDownloadStream: (id: mongoose.Types.ObjectId) => getBucket().openDownloadStream(id),
  find: (filter: any) => getBucket().find(filter),
  delete: (id: mongoose.Types.ObjectId) => getBucket().delete(id)
};

// Define the schema for file metadata
const schema = new Schema<File>(
  {
    filename: {
      type: Schema.Types.String,
      required: true,
    },
    contentType: {
      type: Schema.Types.String,
      required: true,
    },
    size: {
      type: Schema.Types.Number,
      required: true,
    },
    uploadDate: {
      type: Schema.Types.Date,
      default: Date.now,
    },
    metadata: {
      originalName: {
        type: Schema.Types.String,
        required: true,
      },
      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const FileModel = model<File>(DOCUMENT_NAME, schema);