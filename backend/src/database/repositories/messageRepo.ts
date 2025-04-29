import { Aggregate, Mongoose, PipelineStage, Types } from "mongoose";
import Chat, { ChatModel } from "../model/Chat";
import {
  NotFoundError,
  AuthFailureError,
  BadRequestError,
  InternalError,
} from "../../core/ApiError";

import Message, { MessageModel } from "../model/Message";

const chatMessageCommonAggregator = (): PipelineStage[] => {
  return [
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "sender",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              avatarUrl: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};

// find message by Id
const getMessageById = (id: Types.ObjectId): Promise<Message | null> => {
  return MessageModel.findById(id);
};

const getMessagesOfChatId = (
  chatId: Types.ObjectId
): Promise<Array<Message>> => {
  return MessageModel.find({ chatId });
};

const deleteMessageById = (id: Types.ObjectId): Promise<Message | null> => {
  return MessageModel.findByIdAndDelete(id);
};

const deleteAllMessagesOfChatId = (chatId: Types.ObjectId): Promise<any> => {
  return MessageModel.deleteMany({ chat: chatId });
};

// get all messages aggregated
const getAllMessagesAggregated = (chatId: Types.ObjectId): Aggregate<any> => {
  return MessageModel.aggregate([
    {
      $match: {
        chat: chatId,
      },
    },
    {
      $sort: {
        createdAt: 1,
      },
    },
    ...chatMessageCommonAggregator(),
  ]);
};

const getLastMessage = (chatId: Types.ObjectId): Promise<any> => {
  return MessageModel.findOne({ chat: chatId }).sort({ createdAt: -1 }).exec();
};

// Find a duplicate message (same sender, chat, content, and attachments)
const findDuplicateMessage = async (
  userId: Types.ObjectId,
  chatId: Types.ObjectId,
  content: string,
  attachmentFiles: { url: string; fileId?: string; localPath?: string; name?: string; size?: number; type?: string }[]
): Promise<Message | null> => {
  // Only check for duplicates if there's content or attachments
  if (!content && (!attachmentFiles || attachmentFiles.length === 0)) {
    return null;
  }
  
  // Create a query to find a message with the same sender, chat, and content
  const query: any = {
    sender: userId,
    chat: chatId,
  };
  
  // Add content to query if it exists
  if (content) {
    query.content = content;
  }
  
  // If there are attachments, we need to check if they match
  if (attachmentFiles && attachmentFiles.length > 0) {
    // For simplicity, we'll check if the number of attachments matches
    // and if at least one fileId matches (if available)
    const fileIds = attachmentFiles
      .map(a => a.fileId)
      .filter(id => id && id !== 'pending');
      
    if (fileIds.length > 0) {
      query['attachments.fileId'] = { $in: fileIds };
    }
  }
  
  // Find messages that match the criteria, created in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  query.createdAt = { $gte: fiveMinutesAgo };
  
  // Find the most recent matching message
  return await MessageModel.findOne(query).sort({ createdAt: -1 });
};

// create a new message
const createMessage = async (
  userId: Types.ObjectId,
  chatId: Types.ObjectId,
  content: string,
  attachmentFiles: { url: string; fileId?: string; localPath?: string; name?: string; size?: number; type?: string }[],
  status: string = 'sending' // Default status is 'sending'
): Promise<any> => {
  // Check for duplicate messages in the last 5 minutes
  const duplicateMessage = await findDuplicateMessage(userId, chatId, content, attachmentFiles);
  
  if (duplicateMessage) {
    console.log(`Duplicate message detected. Using existing message ID: ${duplicateMessage._id}`);
    return duplicateMessage;
  }
  
  // No duplicate found, create a new message
  return MessageModel.create({
    sender: userId,
    content: content,
    chat: chatId,
    attachments: attachmentFiles,
    status: status,
    readBy: [], // Initially, no one has read the message
  });
};

// Update message status
const updateMessageStatus = async (
  messageId: Types.ObjectId,
  status: string,
  userId?: Types.ObjectId
): Promise<Message | null> => {
  const update: any = { status };
  
  // If userId is provided and status is 'read', add user to readBy array
  if (userId && status === 'read') {
    update.$addToSet = { readBy: userId };
  }
  
  return MessageModel.findByIdAndUpdate(
    messageId,
    update,
    { new: true }
  );
};

// Mark messages as read for a user in a chat
const markMessagesAsRead = async (
  chatId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<boolean> => {
  try {
    // Find all unread messages in the chat that were not sent by the current user
    const result = await MessageModel.updateMany(
      { 
        chat: chatId,
        sender: { $ne: userId }, // Not sent by current user
        readBy: { $ne: userId } // Not already read by current user
      },
      { 
        $set: { status: 'read' },
        $addToSet: { readBy: userId }
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
};

// structure the messages
const getStructuredMessages = (messageId: Types.ObjectId) => {
  return MessageModel.aggregate([
    {
      $match: {
        _id: messageId,
      },
    },
    ...chatMessageCommonAggregator(),
  ]);
};

// Update a message
const updateMessage = async (
  messageId: Types.ObjectId,
  updateData: any
): Promise<Message | null> => {
  return MessageModel.findByIdAndUpdate(
    messageId,
    { $set: updateData },
    { new: true }
  );
};

export default {
  getAllMessagesAggregated,
  createMessage,
  getStructuredMessages,
  getMessageById,
  getMessagesOfChatId,
  deleteMessageById,
  deleteAllMessagesOfChatId,
  getLastMessage,
  updateMessage,
  updateMessageStatus,
  markMessagesAsRead,
};
