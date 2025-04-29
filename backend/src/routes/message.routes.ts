import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares";
import { mongoIdPathValidator } from "../validators/mongoId.validator";
import { validate } from "../validators/validate";
import {
  deleteMessage,
  getAllMessages,
  markMessagesAsReadHandler,
  sendMessage,
} from "../controllers/message.controller";
import { messagesValidator } from "../validators/messages.validator";
import { upload } from "../middlewares/multer.middlwares";

const router = Router();

// verify the jwt token with the verifyJWT middleware for all comming request at this route
router.use(verifyJWT);

router
  .route("/:chatId")
  .get(mongoIdPathValidator("chatId"), validate, getAllMessages)

  .post(
    mongoIdPathValidator("chatId"),
    messagesValidator(),
    validate,
    upload.fields([{ name: "attachments", maxCount: 5 }]),
    sendMessage
  );

// Route to mark messages as read
router
  .route("/:chatId/read")
  .post(mongoIdPathValidator("chatId"), validate, markMessagesAsReadHandler);

router
  .route("/:messageId")
  .delete(mongoIdPathValidator("messageId"), validate, deleteMessage);

export default router;
