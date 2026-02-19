import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connected: false,
  onlineUsers: [],
  conversations: [],
  messagesByConversation: {},
  unreadByConversation: {},
  activeConversationId: null,
};

function dedupeById(messages = []) {
  const seen = new Set();
  const result = [];
  for (const msg of messages) {
    if (!msg?._id) continue;
    if (seen.has(msg._id)) continue;
    seen.add(msg._id);
    result.push(msg);
  }
  return result;
}

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    chatConnected(state) {
      state.connected = true;
    },
    chatDisconnected(state) {
      state.connected = false;
    },
    setConversations(state, action) {
      state.conversations = action.payload || [];
      for (const conv of state.conversations) {
        state.unreadByConversation[conv._id] = Number(conv.unreadCount || 0);
      }
    },
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
    },
    setConversationMessages(state, action) {
      const { conversationId, messages } = action.payload;
      state.messagesByConversation[conversationId] = messages || [];
    },
    appendMessage(state, action) {
      const { conversationId, message } = action.payload;
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      // Reconcile optimistic temp messages with real server messages.
      // If same sender + same content exists as temp-* message, remove temp.
      const senderId =
        typeof message?.sender === "string" ? message.sender : message?.sender?._id;
      state.messagesByConversation[conversationId] = state.messagesByConversation[
        conversationId
      ].filter((m) => {
        const isTemp = typeof m?._id === "string" && m._id.startsWith("temp-");
        const mSenderId =
          typeof m?.sender === "string" ? m.sender : m?.sender?._id;
        const sameSender = senderId && mSenderId && String(senderId) === String(mSenderId);
        const sameContent = String(m?.content || "") === String(message?.content || "");
        return !(isTemp && sameSender && sameContent);
      });

      const exists = state.messagesByConversation[conversationId].some(
        (m) => m._id === message._id
      );
      if (!exists) {
        state.messagesByConversation[conversationId].push(message);
      }
      state.messagesByConversation[conversationId] = dedupeById(
        state.messagesByConversation[conversationId]
      );

      const conversation = state.conversations.find((c) => c._id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.lastMessageAt = message.createdAt || new Date().toISOString();
      }
    },
    replaceTempMessage(state, action) {
      const { conversationId, tempId, message } = action.payload;
      if (!state.messagesByConversation[conversationId]) return;
      state.messagesByConversation[conversationId] = state.messagesByConversation[conversationId].map((m) =>
        m._id === tempId ? message : m
      );
      state.messagesByConversation[conversationId] = dedupeById(
        state.messagesByConversation[conversationId]
      );

      const conversation = state.conversations.find((c) => c._id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.lastMessageAt = message.createdAt || new Date().toISOString();
      }
    },
    removeMessage(state, action) {
      const { conversationId, messageId } = action.payload;
      if (!state.messagesByConversation[conversationId]) return;
      state.messagesByConversation[conversationId] = state.messagesByConversation[
        conversationId
      ].filter((m) => m._id !== messageId);
    },
    markMessageDeletedForEveryone(state, action) {
      const { conversationId, messageId, content } = action.payload;
      if (!state.messagesByConversation[conversationId]) return;
      state.messagesByConversation[conversationId] = state.messagesByConversation[
        conversationId
      ].map((m) =>
        m._id === messageId
          ? {
              ...m,
              content: content || "This message was deleted",
              isDeletedForEveryone: true,
            }
          : m
      );
    },
    setUnreadCount(state, action) {
      const { conversationId, unreadCount } = action.payload;
      state.unreadByConversation[conversationId] = Number(unreadCount || 0);
    },
    setUserOnline(state, action) {
      const userId = action.payload;
      if (!state.onlineUsers.includes(userId)) {
        state.onlineUsers.push(userId);
      }
    },
    setOnlineUsers(state, action) {
      state.onlineUsers = Array.isArray(action.payload) ? [...new Set(action.payload)] : [];
    },
    setUserOffline(state, action) {
      const userId = action.payload;
      state.onlineUsers = state.onlineUsers.filter((id) => id !== userId);
    },
    resetChatState() {
      return initialState;
    },
  },
});

export const {
  chatConnected,
  chatDisconnected,
  setConversations,
  setActiveConversation,
  setConversationMessages,
  appendMessage,
  replaceTempMessage,
  removeMessage,
  markMessageDeletedForEveryone,
  setUnreadCount,
  setUserOnline,
  setOnlineUsers,
  setUserOffline,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
