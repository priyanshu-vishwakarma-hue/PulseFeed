const express = require("express");
const verifyUser = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { chatLimiter } = require("../middlewares/rateLimit");
const {
  createDmSchema,
  createGroupSchema,
  paginationQuerySchema,
  conversationIdParamsSchema,
  messageDeleteParamsSchema,
  sendMessageSchema,
  messageDeleteSchema,
} = require("../validators/chatValidators");
const {
  createOrGetDmConversation,
  createGroupConversation,
  getConversations,
  getConversationMessages,
  markConversationRead,
  sendMessageViaRest,
  deleteMessage,
} = require("../controllers/chatController");

const route = express.Router();

route.use(verifyUser, chatLimiter);

route.post("/conversations/dm", validate({ body: createDmSchema }), createOrGetDmConversation);
route.post("/conversations/group", validate({ body: createGroupSchema }), createGroupConversation);
route.get("/conversations", getConversations);
route.get(
  "/conversations/:id/messages",
  validate({ params: conversationIdParamsSchema, query: paginationQuerySchema }),
  getConversationMessages
);
route.patch(
  "/conversations/:id/read",
  validate({ params: conversationIdParamsSchema }),
  markConversationRead
);
route.post(
  "/conversations/:id/messages",
  validate({ params: conversationIdParamsSchema, body: sendMessageSchema }),
  sendMessageViaRest
);
route.patch(
  "/conversations/:id/messages/:messageId/delete",
  validate({ params: messageDeleteParamsSchema, body: messageDeleteSchema }),
  deleteMessage
);

module.exports = route;
