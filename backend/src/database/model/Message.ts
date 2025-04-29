import { Schema, Types, model } from "mongoose";

export const DOCUMENT_NAME = "Message";

// Define message status enum
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export default interface Message {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  content?: string;
  attachments?: {
    url: string;
    fileId?: string;  // Field for GridFS file ID
    localPath?: string; // Kept for backward compatibility
    name?: string;     // Original filename
    size?: number;     // File size in bytes
    type?: string;     // MIME type
  }[];
  chat: Types.ObjectId;
  status: MessageStatus; // Message delivery status
  readBy: Types.ObjectId[]; // Users who have read the message
  createdAt: Date;
  updatedAt: Date;
}

// define the schema for corresponding document interface
const schema = new Schema<Message>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  content: {
    type: Schema.Types.String,
    trim: false,
    maxlength: 100000,
  },

  attachments: {
    type: [
      {
        url: {
          type: Schema.Types.String,
          trim: true,
        },
        fileId: {
          type: Schema.Types.String,
          trim: true,
        },
        localPath: {
          type: Schema.Types.String,
          trim: true,
        },
        name: {
          type: Schema.Types.String,
          trim: true,
        },
        size: {
          type: Schema.Types.Number,
        },
        type: {
          type: Schema.Types.String,
          trim: true,
        },
      },
    ],
    default: [],
    // maxlength: 30, // max length to send a limited attachment
  },

  chat: {
    type: Schema.Types.ObjectId,
    ref: "Chat",
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENDING,
  },
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: "User",
    default: [],
  }],
  createdAt: {
    type: Schema.Types.Date,
    default: Date.now,
  },
  updatedAt: {
    type: Schema.Types.Date,
    default: Date.now,
  },
});

export const MessageModel = model<Message>(DOCUMENT_NAME, schema);
