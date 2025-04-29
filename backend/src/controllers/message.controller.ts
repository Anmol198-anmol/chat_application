import { ProtectedRequest } from "../types/app-request";
import {
  AuthFailureError,
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../core/ApiError";
import { SuccessMsgResponse, SuccessResponse } from "../core/ApiResponse";
import { Request, Response } from "express";
import { Types } from "mongoose";
import chatRepo from "../database/repositories/chatRepo";
import messageRepo from "../database/repositories/messageRepo";
import fileRepo from "../database/repositories/fileRepo";
import asyncHandler from "../helpers/asyncHandler";
import {
  getLocalFilePath,
  getStaticFilePath,
  removeLocalFile,
} from "../helpers/utils";
import { emitSocketEvent } from "../socket";
import { ChatEventEnum } from "../constants";
import Chat from "../database/model/Chat";
import { getFileUrl } from "./file.controller";

export const getAllMessages = asyncHandler(
  async (req: ProtectedRequest, res: Response) => {
    const { chatId } = req.params;
    const currentUser = req.user;

    // retrieve the chat of corresponding chatId
    const selectedChat = await chatRepo.getChatByChatId(
      new Types.ObjectId(chatId)
    );

    // if not chat found throw an error
    if (!selectedChat) {
      throw new NotFoundError("no chat found to retrieve messages");
    }

    // check for existance of current user in the chats
    if (selectedChat.participants?.includes(currentUser?._id)) {
      throw new AuthFailureError("you don't own the chat !");
    }

    // get all the messages in aggreated form
    const messages = await messageRepo.getAllMessagesAggregated(
      new Types.ObjectId(chatId)
    );

    if (!messages) {
      throw new InternalError("error while retrieving messages");
    }

    return new SuccessResponse(
      "messages retrieved successfully",
      messages
    ).send(res);
  }
);

// send a message
export const sendMessage = asyncHandler(
  async (req: ProtectedRequest, res: Response) => {
    const { content } = req.body;
    const { chatId } = req.params;
    const currentUserId = req.user?._id;
    const files = (req.files as { attachments?: Express.Multer.File[] }) || {
      attachments: [],
    };

    if (!chatId) {
      throw new BadRequestError("no chat id provided");
    }

    if (!content && !files.attachments?.length) {
      throw new BadRequestError("no content provided");
    }

    const selectedChat = await chatRepo.getChatByChatId(
      new Types.ObjectId(chatId)
    );

    if (!selectedChat) {
      throw new NotFoundError("No chat found");
    }

    // Store files in GridFS instead of local filesystem
    const attachmentFiles: { url: string; fileId: string; name: string; size: number; type: string }[] = [];

    // Process each attachment file
    if (files.attachments && files.attachments.length > 0) {
      // First, create a message with pending attachments to show upload progress
      const pendingAttachments = files.attachments.map(file => ({
        url: "#pending",
        fileId: "pending",
        name: file.originalname,
        size: file.size,
        type: file.mimetype
      }));

      // Create a temporary message to show upload is in progress
      const pendingMessage = await messageRepo.createMessage(
        new Types.ObjectId(currentUserId),
        new Types.ObjectId(chatId),
        content || "",
        pendingAttachments
      );

      // Get the structured pending message
      const structuredPendingMessage = await messageRepo.getStructuredMessages(pendingMessage._id);
      
      // Add upload status to the message
      const pendingMessageWithStatus = {
        ...structuredPendingMessage[0],
        uploadStatus: {
          inProgress: true,
          progress: 0,
          total: files.attachments.length
        }
      };

      // Emit the pending message to all participants
      selectedChat.participants.forEach((participantId: Types.ObjectId) => {
        emitSocketEvent(
          req,
          participantId.toString(),
          ChatEventEnum.MESSAGE_RECEIVED_EVENT,
          pendingMessageWithStatus
        );
      });

      // Process each file and update progress
      let completedUploads = 0;
      
      for (const attachment of files.attachments) {
        try {
          // Upload file to GridFS
          const fileId = await fileRepo.uploadFile(
            attachment.buffer,
            `${Date.now()}-${attachment.originalname.replace(/\s+/g, '-')}`,
            attachment.mimetype,
            new Types.ObjectId(currentUserId),
            attachment.originalname
          );
          
          // Add file info to attachments array
          attachmentFiles.push({
            url: getFileUrl(fileId),
            fileId: fileId,
            name: attachment.originalname,
            size: attachment.size,
            type: attachment.mimetype
          });

          // Update progress
          completedUploads++;
          
          // Emit progress update
          const progressUpdate = {
            messageId: pendingMessage._id,
            uploadStatus: {
              inProgress: completedUploads < files.attachments.length,
              progress: completedUploads,
              total: files.attachments.length
            }
          };

          selectedChat.participants.forEach((participantId: Types.ObjectId) => {
            emitSocketEvent(
              req,
              participantId.toString(),
              ChatEventEnum.UPLOAD_PROGRESS_EVENT,
              progressUpdate
            );
          });
          
        } catch (error) {
          // If an upload fails, continue with the others but log the error
          console.error(`Failed to upload file ${attachment.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update the pending message with the actual file references
      await messageRepo.updateMessage(pendingMessage._id, {
        attachments: attachmentFiles
      });

      // Get the updated message
      const updatedMessage = await messageRepo.getStructuredMessages(pendingMessage._id);
      
      if (!updatedMessage || updatedMessage.length === 0) {
        throw new InternalError("Failed to update message with attachments");
      }

      // Add completion status
      const finalMessage = {
        ...updatedMessage[0],
        uploadStatus: {
          inProgress: false,
          progress: files.attachments.length,
          total: files.attachments.length
        }
      };

      // Update the last message in the chat
      await chatRepo.updateChatFields(selectedChat._id, {
        $set: {
          lastMessage: pendingMessage._id,
        },
      });

      // Emit the final message to all participants
      selectedChat.participants.forEach((participantId: Types.ObjectId) => {
        emitSocketEvent(
          req,
          participantId.toString(),
          ChatEventEnum.MESSAGE_UPDATED_EVENT,
          finalMessage
        );
      });

      return new SuccessResponse(
        "Message sent successfully",
        finalMessage
      ).send(res);
    } else {
      // No attachments, just send the message normally
      const message = await messageRepo.createMessage(
        new Types.ObjectId(currentUserId),
        new Types.ObjectId(chatId),
        content || "",
        []
      );

      // Update the last message in the chat
      await chatRepo.updateChatFields(selectedChat._id, {
        $set: {
          lastMessage: message._id,
        },
      });

      // Get the structured message to send back to the client
      const structuredMessage = await messageRepo.getStructuredMessages(message._id);

      if (!structuredMessage || structuredMessage.length === 0) {
        throw new InternalError("Failed to create message");
      }

      // Emit socket event to all participants in the chat
      selectedChat.participants.forEach((participantId: Types.ObjectId) => {
        emitSocketEvent(
          req,
          participantId.toString(),
          ChatEventEnum.MESSAGE_RECEIVED_EVENT,
          structuredMessage[0]
        );
      });

      return new SuccessResponse(
        "Message sent successfully",
        structuredMessage[0]
      ).send(res);
    }
  }
);

// delete message
export const deleteMessage = asyncHandler(
  async (req: ProtectedRequest, res: Response) => {
    const { messageId } = req.params;
    const currentUserId = req.user?._id;

    if (!messageId) {
      throw new BadRequestError("no message id provided");
    }

    const existingMessage = await messageRepo.getMessageById(
      new Types.ObjectId(messageId)
    );

    if (!existingMessage)
      throw new BadRequestError("invalid message id, message not found");

    // fetch the existing chat
    const existingChat = await chatRepo.getChatByChatId(existingMessage?.chat);

    if (!existingChat)
      throw new InternalError("Internal Error: chat not found");

    // if the existing chat participants includes the current userId
    if (
      !existingChat?.participants?.some(
        (participantId) => participantId.toString() === currentUserId.toString()
      )
    ) {
      throw new AuthFailureError("you don't own the message");
    }

    // check if for currentUserId presence in the message sender
    if (!(existingMessage.sender.toString() === currentUserId.toString()))
      throw new AuthFailureError("you don't own the message ");

    // Delete the attachments from GridFS
    if (
      existingMessage &&
      existingMessage.attachments &&
      existingMessage.attachments.length > 0
    ) {
      for (const attachment of existingMessage.attachments) {
        // Extract fileId from the URL or use the fileId field directly
        const fileId = attachment.fileId || attachment.url.split('/').pop();
        
        if (fileId) {
          try {
            await fileRepo.deleteFile(fileId);
          } catch (error) {
            // Log error but continue with message deletion
            console.error(`Failed to delete file ${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // delete the message from database
    const deletedMsg = await messageRepo.deleteMessageById(existingMessage._id);

    if (!deletedMsg)
      throw new InternalError("Internal Error: Couldn't delete message");

    // update the last message of the chat
    let lastMessage: any;
    if (
      existingChat?.lastMessage?.toString() === existingMessage._id.toString()
    ) {
      lastMessage = await messageRepo.getLastMessage(existingChat._id);

      await chatRepo.updateChatFields(existingChat._id, {
        $set: {
          lastMessage: lastMessage?._id,
        },
      });
    }

    // emit delete message event to all users
    existingChat.participants.forEach((participantId: Types.ObjectId) => {
      if (participantId.toString() === currentUserId.toString()) return;

      emitSocketEvent(
        req,
        participantId.toString(),
        ChatEventEnum.MESSAGE_DELETE_EVENT,
        {
          messageId: existingMessage._id,
          chatId: existingChat._id,
          lastMessage: lastMessage ? {
            content: lastMessage.content || "",
            attachments: lastMessage.attachments?.length || 0
          } : null
        }
      );
    });

    return new SuccessMsgResponse("message deleted successfully").send(res);
  }
);
