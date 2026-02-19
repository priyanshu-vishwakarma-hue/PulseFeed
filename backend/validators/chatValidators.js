const { z } = require("zod");

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
const usernameSchema = z
  .string()
  .trim()
  .regex(/^@?[a-zA-Z0-9_.-]{3,50}$/, "Invalid username");

const paginationQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createDmSchema = z
  .object({
    participantId: z.union([objectIdSchema, usernameSchema]),
  })
  .strict();

const createGroupSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    participantIds: z.array(objectIdSchema).min(2).max(100),
  })
  .strict();

const conversationIdParamsSchema = z.object({
  id: objectIdSchema,
});

const sendMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

const messageDeleteSchema = z
  .object({
    scope: z.enum(["me", "everyone"]),
  })
  .strict();

const messageDeleteParamsSchema = z.object({
  id: objectIdSchema,
  messageId: objectIdSchema,
});

const socketJoinConversationSchema = z
  .object({
    conversationId: objectIdSchema,
  })
  .strict();

const socketSendMessageSchema = z
  .object({
    conversationId: objectIdSchema,
    content: z.string().trim().min(1).max(2000),
    clientTempId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

const socketDeleteMessageSchema = z
  .object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema,
    scope: z.enum(["me", "everyone"]),
  })
  .strict();

module.exports = {
  objectIdSchema,
  paginationQuerySchema,
  createDmSchema,
  createGroupSchema,
  conversationIdParamsSchema,
  messageDeleteParamsSchema,
  sendMessageSchema,
  messageDeleteSchema,
  socketJoinConversationSchema,
  socketSendMessageSchema,
  socketDeleteMessageSchema,
  usernameSchema,
};
