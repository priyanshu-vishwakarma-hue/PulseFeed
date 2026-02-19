const mongoose = require("mongoose");
const Conversation = require("../models/conversationSchema");
const Message = require("../models/messageSchema");
const User = require("../models/userSchema");

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

function buildDmKey(a, b) {
  return [String(a), String(b)].sort().join(":");
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    profilePic: user.profilePic,
  };
}

async function ensureUsersExist(ids) {
  const uniqueIds = [...new Set(ids.map(String))];
  const users = await User.find({ _id: { $in: uniqueIds } }).select("_id");
  return users.length === uniqueIds.length;
}

async function resolveUserByIdOrUsername(identifier) {
  const value = String(identifier || "").trim();
  if (!value) return null;

  if (/^[0-9a-fA-F]{24}$/.test(value)) {
    return User.findById(value).select("_id name username profilePic");
  }

  const normalizedUsername = value.startsWith("@") ? value.slice(1) : value;
  return User.findOne({ username: normalizedUsername }).select(
    "_id name username profilePic"
  );
}

async function createOrGetDmConversation(req, res) {
  try {
    const currentUserId = req.user;
    const { participantId: participantIdentifier } = req.body;

    const currentUser = await User.findById(currentUserId).select("_id");
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "Current user not found. Please sign in again.",
      });
    }

    const participantUser = await resolveUserByIdOrUsername(participantIdentifier);
    if (!participantUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }
    const participantId = String(participantUser._id);

    if (currentUserId === participantId) {
      return res.status(400).json({ success: false, message: "You cannot create DM with yourself" });
    }

    const dmKey = buildDmKey(currentUserId, participantId);

    let conversation = await Conversation.findOne({ type: "dm", dmKey })
      .populate("participants", "name username profilePic")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "name username profilePic" } });

    if (!conversation) {
      conversation = await Conversation.create({
        type: "dm",
        dmKey,
        participants: [currentUserId, participantId],
        admins: [],
        createdBy: currentUserId,
        unreadCounts: {
          [String(currentUserId)]: 0,
          [String(participantId)]: 0,
        },
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "name username profilePic")
        .populate({ path: "lastMessage", populate: { path: "sender", select: "name username profilePic" } });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createGroupConversation(req, res) {
  try {
    const currentUserId = req.user;
    const { name, participantIds } = req.body;

    const dedupedParticipants = [...new Set([currentUserId, ...participantIds].map(String))];

    if (dedupedParticipants.length < 3) {
      return res.status(400).json({ success: false, message: "Group must contain at least 3 members" });
    }

    const usersExist = await ensureUsersExist(dedupedParticipants);
    if (!usersExist) {
      return res.status(404).json({ success: false, message: "One or more users not found" });
    }

    const unreadCounts = {};
    for (const userId of dedupedParticipants) unreadCounts[userId] = 0;

    const conversation = await Conversation.create({
      type: "group",
      name,
      participants: dedupedParticipants,
      admins: [currentUserId],
      createdBy: currentUserId,
      unreadCounts,
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name username profilePic")
      .populate("admins", "name username profilePic");

    return res.status(201).json({ success: true, conversation: populatedConversation });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getConversations(req, res) {
  try {
    const currentUserId = req.user;

    const conversations = await Conversation.find({ participants: currentUserId })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "name username profilePic")
      .populate("admins", "name username profilePic")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name username profilePic" },
      })
      .lean();

    const list = conversations.map((conversation) => ({
      ...conversation,
      participants: (conversation.participants || []).map(sanitizeUser),
      admins: (conversation.admins || []).map(sanitizeUser),
      unreadCount: Number(conversation?.unreadCounts?.[currentUserId] || 0),
      lastMessage:
        conversation?.lastMessage &&
        Array.isArray(conversation.lastMessage.deletedFor) &&
        conversation.lastMessage.deletedFor.some(
          (id) => String(id) === String(currentUserId)
        )
          ? null
          : conversation.lastMessage,
    }));

    return res.status(200).json({ success: true, conversations: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getConversationMessages(req, res) {
  try {
    const currentUserId = req.user;
    const { id: conversationId } = req.params;
    const { cursor, limit = 30 } = req.query;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: currentUserId }).select("_id");
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Not authorized for this conversation" });
    }

    const query = {
      conversationId,
      deletedFor: { $ne: toObjectId(currentUserId) },
    };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "name username profilePic")
      .lean();

    const ordered = messages.reverse().map((msg) => ({
      ...msg,
      content: msg.isDeletedForEveryone ? "This message was deleted" : msg.content,
    }));
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt : null;

    return res.status(200).json({
      success: true,
      messages: ordered,
      nextCursor,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function markConversationRead(req, res) {
  try {
    const currentUserId = req.user;
    const { id: conversationId } = req.params;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: currentUserId });
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Not authorized for this conversation" });
    }

    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: toObjectId(currentUserId) },
        readBy: { $ne: toObjectId(currentUserId) },
      },
      {
        $addToSet: { readBy: toObjectId(currentUserId) },
      }
    );

    conversation.unreadCounts.set(String(currentUserId), 0);
    await conversation.save();

    return res.status(200).json({ success: true, message: "Conversation marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function sendMessageViaRest(req, res) {
  try {
    const currentUserId = req.user;
    const { id: conversationId } = req.params;
    const { content } = req.body;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: currentUserId });
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Not authorized for this conversation" });
    }

    const senderObjectId = toObjectId(currentUserId);
    const message = await Message.create({
      conversationId,
      sender: senderObjectId,
      content,
      messageType: "text",
      readBy: [senderObjectId],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    for (const participant of conversation.participants) {
      const key = String(participant);
      const currentCount = Number(conversation.unreadCounts.get(key) || 0);
      if (key === String(currentUserId)) {
        conversation.unreadCounts.set(key, 0);
      } else {
        conversation.unreadCounts.set(key, currentCount + 1);
      }
    }
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name username profilePic")
      .lean();

    return res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteMessage(req, res) {
  try {
    const currentUserId = req.user;
    const { id: conversationId, messageId } = req.params;
    const { scope } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });
    if (!conversation) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized for this conversation" });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversationId,
    });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const io = req.app.get("io");

    if (scope === "everyone") {
      if (String(message.sender) !== String(currentUserId)) {
        return res.status(403).json({
          success: false,
          message: "Only sender can delete for everyone",
        });
      }

      message.isDeletedForEveryone = true;
      message.content = "This message was deleted";
      // Ensure it remains visible in history for everyone after reload.
      message.deletedFor = [];
      message.deletedAt = new Date();
      message.deletedBy = toObjectId(currentUserId);
      await message.save();

      if (io) {
        io.to(`conv:${conversationId}`).emit("chat:message_deleted", {
          conversationId,
          messageId,
          scope: "everyone",
          content: message.content,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Message deleted for everyone",
      });
    }

    message.deletedFor = message.deletedFor || [];
    const alreadyDeleted = message.deletedFor.some(
      (id) => String(id) === String(currentUserId)
    );
    if (!alreadyDeleted) {
      message.deletedFor.push(toObjectId(currentUserId));
      await message.save();
    }

    if (io) {
      io.to(`user:${currentUserId}`).emit("chat:message_deleted", {
        conversationId,
        messageId,
        scope: "me",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted for you",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  buildDmKey,
  sanitizeUser,
  createOrGetDmConversation,
  createGroupConversation,
  getConversations,
  getConversationMessages,
  markConversationRead,
  sendMessageViaRest,
  deleteMessage,
};
