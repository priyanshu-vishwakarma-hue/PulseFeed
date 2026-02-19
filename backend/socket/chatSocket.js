const { verifyJWT } = require("../utils/generateToken");
const Conversation = require("../models/conversationSchema");
const Message = require("../models/messageSchema");
const User = require("../models/userSchema");
const {
  socketJoinConversationSchema,
  socketSendMessageSchema,
  socketDeleteMessageSchema,
} = require("../validators/chatValidators");

const {
  CHAT_MESSAGE_MAX_LENGTH,
  SOCKET_RATE_LIMIT_WINDOW_MS,
  SOCKET_RATE_LIMIT_MAX_MESSAGES,
} = require("../config/dotenv.config");

const socketThrottleWindow = Number(SOCKET_RATE_LIMIT_WINDOW_MS) || 10_000;
const socketThrottleMax = Number(SOCKET_RATE_LIMIT_MAX_MESSAGES) || 12;
const chatMessageMaxLength = Number(CHAT_MESSAGE_MAX_LENGTH) || 2000;

function setupChatSocket(io) {
  const presenceCounts = new Map();
  const throttleMap = new Map();

  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) {
        return next(new Error("error:unauthorized"));
      }
      const decoded = verifyJWT(token);
      if (!decoded?.id) {
        return next(new Error("error:unauthorized"));
      }
      socket.userId = String(decoded.id);
      next();
    } catch (error) {
      next(new Error("error:unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    const currentCount = presenceCounts.get(userId) || 0;
    presenceCounts.set(userId, currentCount + 1);
    if (currentCount === 0) {
      io.emit("presence:user_online", { userId });
    }

    const currentUser = await User.findById(userId).select("name username profilePic").lean();

    // Send current online users snapshot so new clients render accurate presence immediately.
    socket.emit("presence:online_users", {
      userIds: Array.from(presenceCounts.keys()),
    });

    socket.on("chat:join_conversation", async (payload = {}) => {
      try {
        const { conversationId } = socketJoinConversationSchema.parse(payload);
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).select("_id");
        if (!conversation) {
          return socket.emit("error:unauthorized", { message: "Not authorized for this conversation" });
        }
        socket.join(`conv:${conversationId}`);
      } catch (error) {
        socket.emit("error:validation", {
          message: "Invalid join conversation payload",
          errors: error?.issues || [],
        });
      }
    });

    socket.on("chat:leave_conversation", (payload = {}) => {
      try {
        const { conversationId } = socketJoinConversationSchema.parse(payload);
        socket.leave(`conv:${conversationId}`);
      } catch (error) {
        socket.emit("error:validation", {
          message: "Invalid leave conversation payload",
          errors: error?.issues || [],
        });
      }
    });

    socket.on("chat:send_message", async (payload = {}) => {
      try {
        const now = Date.now();
        const bucket = throttleMap.get(userId) || [];
        const recent = bucket.filter((ts) => now - ts < socketThrottleWindow);
        if (recent.length >= socketThrottleMax) {
          throttleMap.set(userId, recent);
          return socket.emit("error:rate_limited", {
            message: "Too many messages. Please slow down.",
          });
        }
        recent.push(now);
        throttleMap.set(userId, recent);

        const { conversationId, content, clientTempId } = socketSendMessageSchema.parse(payload);
        if (content.length > chatMessageMaxLength) {
          return socket.emit("error:validation", {
            message: `Message exceeds max length (${chatMessageMaxLength})`,
          });
        }

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) {
          return socket.emit("error:unauthorized", {
            message: "Not authorized for this conversation",
          });
        }

        const message = await Message.create({
          conversationId,
          sender: userId,
          content,
          messageType: "text",
          readBy: [userId],
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;

        for (const participant of conversation.participants) {
          const participantId = String(participant);
          const currentUnread = Number(conversation.unreadCounts.get(participantId) || 0);
          if (participantId === userId) {
            conversation.unreadCounts.set(participantId, 0);
          } else {
            conversation.unreadCounts.set(participantId, currentUnread + 1);
          }
        }

        await conversation.save();

        const payloadMessage = {
          _id: message._id,
          conversationId,
          sender: {
            _id: userId,
            name: currentUser?.name,
            username: currentUser?.username,
            profilePic: currentUser?.profilePic || null,
          },
          content: message.content,
          messageType: message.messageType,
          readBy: message.readBy,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        };

        io.to(`conv:${conversationId}`).emit("chat:new_message", {
          conversationId,
          message: payloadMessage,
        });

        for (const participant of conversation.participants) {
          const participantId = String(participant);
          io.to(`user:${participantId}`).emit("chat:unread_updated", {
            conversationId,
            unreadCount: Number(conversation.unreadCounts.get(participantId) || 0),
          });
        }

        socket.emit("chat:message_sent_ack", {
          clientTempId: clientTempId || null,
          message: payloadMessage,
        });
      } catch (error) {
        socket.emit("error:validation", {
          message: "Invalid message payload",
          errors: error?.issues || [],
        });
      }
    });

    socket.on("chat:delete_message", async (payload = {}) => {
      try {
        const { conversationId, messageId, scope } =
          socketDeleteMessageSchema.parse(payload);

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) {
          return socket.emit("error:unauthorized", {
            message: "Not authorized for this conversation",
          });
        }

        const message = await Message.findOne({
          _id: messageId,
          conversationId,
        });
        if (!message) {
          return socket.emit("error:validation", {
            message: "Message not found",
          });
        }

        if (scope === "everyone") {
          if (String(message.sender) !== String(userId)) {
            return socket.emit("error:unauthorized", {
              message: "Only sender can delete for everyone",
            });
          }

          message.isDeletedForEveryone = true;
          message.content = "This message was deleted";
          // Force visibility for everyone on reload/history fetch.
          message.deletedFor = [];
          message.deletedAt = new Date();
          message.deletedBy = userId;
          await message.save();

          io.to(`conv:${conversationId}`).emit("chat:message_deleted", {
            conversationId,
            messageId,
            scope: "everyone",
            content: message.content,
          });
          return;
        }

        message.deletedFor = message.deletedFor || [];
        const exists = message.deletedFor.some((id) => String(id) === String(userId));
        if (!exists) {
          message.deletedFor.push(userId);
          await message.save();
        }

        io.to(`user:${userId}`).emit("chat:message_deleted", {
          conversationId,
          messageId,
          scope: "me",
        });
      } catch (error) {
        socket.emit("error:validation", {
          message: "Invalid delete message payload",
          errors: error?.issues || [],
        });
      }
    });

    socket.on("disconnect", () => {
      const count = presenceCounts.get(userId) || 0;
      if (count <= 1) {
        presenceCounts.delete(userId);
        io.emit("presence:user_offline", { userId });
      } else {
        presenceCounts.set(userId, count - 1);
      }
    });
  });
}

module.exports = setupChatSocket;
