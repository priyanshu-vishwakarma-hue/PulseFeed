import { io } from "socket.io-client";
import { getSocketBaseUrl } from "./network";

let socket;

export function connectChatSocket(token, handlers = {}) {
  if (!token) return null;
  if (socket?.connected) return socket;

  socket = io(getSocketBaseUrl(), {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500,
    auth: {
      token,
    },
  });

  socket.on("connect", () => handlers.onConnect?.());
  socket.on("disconnect", () => handlers.onDisconnect?.());

  socket.on("presence:user_online", ({ userId }) => handlers.onUserOnline?.(userId));
  socket.on("presence:user_offline", ({ userId }) => handlers.onUserOffline?.(userId));
  socket.on("presence:online_users", ({ userIds }) => handlers.onOnlineUsers?.(userIds || []));
  socket.on("chat:new_message", (payload) => handlers.onNewMessage?.(payload));
  socket.on("chat:unread_updated", (payload) => handlers.onUnreadUpdate?.(payload));
  socket.on("chat:message_deleted", (payload) => handlers.onMessageDeleted?.(payload));

  socket.on("error:unauthorized", (payload) => {
    handlers.onUnauthorized?.(payload);
    socket?.disconnect();
  });

  socket.on("connect_error", (error) => {
    handlers.onConnectError?.(error);
    if (error?.message === "error:unauthorized") {
      handlers.onUnauthorized?.({ message: "Unauthorized" });
      socket?.disconnect();
    }
  });

  return socket;
}

export function getChatSocket() {
  return socket;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
