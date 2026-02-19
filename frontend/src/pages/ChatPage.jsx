import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "../components/Avatar";
import { getApiBaseUrl } from "../utils/network";
import { getChatSocket } from "../utils/chatSocket";
import {
  appendMessage,
  markMessageDeletedForEveryone,
  removeMessage,
  replaceTempMessage,
  setActiveConversation,
  setConversationMessages,
  setConversations,
  setUnreadCount,
} from "../utils/chatSlice";

function ChatPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { token, id: userId } = useSelector((state) => state.user);
  const {
    conversations,
    messagesByConversation,
    activeConversationId,
    unreadByConversation,
    onlineUsers,
    connected,
  } = useSelector((state) => state.chat);

  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [dmUserId, setDmUserId] = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c._id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const messages = activeConversationId
    ? messagesByConversation[activeConversationId] || []
    : [];

  const activeDmPeer = useMemo(() => {
    if (!activeConversation || activeConversation.type !== "dm") return null;
    return (activeConversation.participants || []).find((p) => p._id !== userId) || null;
  }, [activeConversation, userId]);

  async function fetchConversations() {
    if (!token) return;
    setIsLoadingConversations(true);
    try {
      const res = await axios.get(`${getApiBaseUrl()}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.conversations || [];
      dispatch(setConversations(list));
      if (list.length > 0 && !activeConversationId) {
        dispatch(setActiveConversation(list[0]._id));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch conversations");
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function fetchMessages(conversationId) {
    if (!token || !conversationId) return;
    setIsLoadingMessages(true);
    try {
      const res = await axios.get(
        `${getApiBaseUrl()}/conversations/${conversationId}/messages?limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      dispatch(
        setConversationMessages({
          conversationId,
          messages: res.data?.messages || [],
        })
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function markRead(conversationId) {
    if (!token || !conversationId) return;
    try {
      await axios.patch(
        `${getApiBaseUrl()}/conversations/${conversationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      dispatch(setUnreadCount({ conversationId, unreadCount: 0 }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark read");
    }
  }

  async function startDm(prefillUserId = "") {
    if (!token) return;
    const candidate =
      typeof prefillUserId === "string" ? prefillUserId : dmUserId;
    const participantInput = candidate.trim();
    if (!participantInput) {
      toast.error("Enter participant username or id");
      return;
    }

    let participantId = participantInput;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(participantInput);

    // If user typed a name/username text, resolve it to a concrete username first.
    if (!isObjectId) {
      try {
        const res = await axios.get(
          `${getApiBaseUrl()}/users-search?q=${encodeURIComponent(participantInput)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const users = (res.data?.users || []).filter((u) => u._id !== userId);
        const normalized = participantInput.replace(/^@/, "").toLowerCase();

        const exactUsername = users.find(
          (u) => (u.username || "").toLowerCase() === normalized
        );
        const exactName = users.find(
          (u) => (u.name || "").trim().toLowerCase() === participantInput.toLowerCase()
        );

        if (exactUsername) {
          participantId = exactUsername.username;
        } else if (exactName && users.length === 1) {
          participantId = exactName.username;
        } else if (users.length > 1 && !exactName) {
          toast.error("Multiple users found. Please pick one from suggestions.");
          return;
        }
      } catch {
        // Fallback: let backend try direct resolution.
      }
    }

    try {
      const res = await axios.post(
        `${getApiBaseUrl()}/conversations/dm`,
        { participantId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const conversation = res.data?.conversation;
      if (!conversation?._id) {
        toast.error("Could not create conversation");
        return;
      }

      await fetchConversations();
      dispatch(setActiveConversation(conversation._id));
      setDmUserId("");
      setUserSuggestions([]);
      toast.success("DM ready");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start DM");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!activeConversationId) return toast.error("Select a conversation first");

    const content = messageText.trim();
    if (!content) return;

    const socket = getChatSocket();
    const clientTempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: clientTempId,
      conversationId: activeConversationId,
      sender: { _id: userId, name: "You" },
      content,
      createdAt: new Date().toISOString(),
    };
    dispatch(appendMessage({ conversationId: activeConversationId, message: optimisticMessage }));

    try {
      if (socket?.connected) {
        socket.emit("chat:send_message", {
          conversationId: activeConversationId,
          content,
          clientTempId,
        });
      } else {
        const res = await axios.post(
          `${getApiBaseUrl()}/conversations/${activeConversationId}/messages`,
          { content },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.data?.message) {
          dispatch(
            replaceTempMessage({
              conversationId: activeConversationId,
              tempId: clientTempId,
              message: res.data.message,
            })
          );
        }
      }
      setMessageText("");
    } catch (error) {
      fetchMessages(activeConversationId);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  }

  async function handleDeleteMessage({ messageId, scope, isMine }) {
    if (!activeConversationId || !messageId) return;
    if (scope === "everyone" && !isMine) {
      toast.error("Only sender can delete for everyone");
      return;
    }

    const socket = getChatSocket();
    setOpenMessageMenuId(null);

    try {
      if (socket?.connected) {
        socket.emit("chat:delete_message", {
          conversationId: activeConversationId,
          messageId,
          scope,
        });
        return;
      }

      await axios.patch(
        `${getApiBaseUrl()}/conversations/${activeConversationId}/messages/${messageId}/delete`,
        { scope },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (scope === "everyone") {
        dispatch(
          markMessageDeletedForEveryone({
            conversationId: activeConversationId,
            messageId,
            content: "This message was deleted",
          })
        );
      } else {
        dispatch(removeMessage({ conversationId: activeConversationId, messageId }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  }

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const participantId = (searchParams.get("user") || "").trim();
    if (participantId) {
      startDm(participantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token]);

  useEffect(() => {
    if (!activeConversationId) return;

    const socket = getChatSocket();
    socket?.emit("chat:join_conversation", { conversationId: activeConversationId });

    fetchMessages(activeConversationId);
    markRead(activeConversationId);

    return () => {
      socket?.emit("chat:leave_conversation", { conversationId: activeConversationId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, token]);

  async function handleStartDmSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = String(formData.get("dmTarget") || "").trim();
    if (value && value !== dmUserId) {
      setDmUserId(value);
    }
    await startDm(value);
  }

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    const onAck = ({ clientTempId, message }) => {
      if (!clientTempId || !message?.conversationId) return;
      dispatch(
        replaceTempMessage({
          conversationId: message.conversationId,
          tempId: clientTempId,
          message,
        })
      );
    };

    socket.on("chat:message_sent_ack", onAck);
    return () => socket.off("chat:message_sent_ack", onAck);
  }, [dispatch]);

  useEffect(() => {
    const query = dmUserId.trim();
    if (!token || query.length < 2) {
      setUserSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const res = await axios.get(`${getApiBaseUrl()}/users-search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserSuggestions((res.data?.users || []).filter((u) => u._id !== userId));
      } catch {
        setUserSuggestions([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [dmUserId, token, userId]);

  useEffect(() => {
    if (!openMessageMenuId) return;

    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-msg-menu]") || target.closest("[data-msg-menu-btn]")) {
        return;
      }
      setOpenMessageMenuId(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openMessageMenuId]);

  if (!token) {
    return <Navigate to="/signin" />;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Chat</h1>
        <span
          className={`text-sm font-medium ${
            connected ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {connected ? "Live connected" : "Connecting..."}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <aside className="rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800 p-3">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Start DM</p>
            <form onSubmit={handleStartDmSubmit} className="mt-2 flex gap-2">
              <div className="relative w-full">
                <input
                  name="dmTarget"
                  type="text"
                  value={dmUserId}
                  onChange={(e) => setDmUserId(e.target.value)}
                  placeholder="Search username"
                  className="w-full p-2 text-sm"
                />
                {(isSearchingUsers || userSuggestions.length > 0) && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-20 max-h-56 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
                    {isSearchingUsers ? (
                      <p className="text-xs p-2 text-neutral-500">Searching...</p>
                    ) : (
                      userSuggestions.map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => {
                            setDmUserId(user.username);
                            setUserSuggestions([]);
                          }}
                          className="w-full px-2 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                        >
                          <Avatar name={user.name} src={user.profilePic} className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="text-sm text-neutral-800 dark:text-neutral-100">{user.name}</p>
                            <p className="text-xs text-neutral-500">@{user.username}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
              >
                Start
              </button>
            </form>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Conversations</p>

            {isLoadingConversations ? (
              <div className="flex justify-center py-6"><span className="loader"></span></div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-neutral-500">No conversations yet.</p>
            ) : (
              <div className="space-y-1.5">
                {conversations.map((conv) => {
                  const other =
                    conv.type === "dm"
                      ? (conv.participants || []).find((p) => p._id !== userId)
                      : null;

                  const title = conv.type === "group" ? conv.name : other?.name || "Unknown user";
                  const unread = Number(unreadByConversation[conv._id] || 0);
                  const active = conv._id === activeConversationId;
                  const isOtherOnline = other ? onlineUsers.includes(other._id) : false;

                  return (
                    <button
                      key={conv._id}
                      onClick={() => dispatch(setActiveConversation(conv._id))}
                      className={`w-full text-left rounded-xl px-3 py-2 border transition ${
                        active
                          ? "border-primary-200 bg-primary-50 dark:border-primary-900/40 dark:bg-primary-900/20"
                          : "border-transparent hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar
                            name={title}
                            src={other?.profilePic}
                            className="w-9 h-9 rounded-full"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{title}</p>
                            <p className="truncate text-xs text-neutral-500">
                              {conv.lastMessage?.content || "No messages yet"}
                            </p>
                          </div>
                          {conv.type === "dm" && (
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isOtherOnline ? "bg-emerald-500" : "bg-neutral-400"
                              }`}
                            />
                          )}
                        </div>
                        {unread > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800 flex flex-col h-[70vh]">
          {activeConversation ? (
            <>
              <div className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
                {activeDmPeer?.username ? (
                  <Link
                    to={`/@${activeDmPeer.username}`}
                    className="inline-flex items-center gap-2 hover:opacity-90"
                  >
                    <Avatar
                      name={activeDmPeer.name}
                      src={activeDmPeer.profilePic}
                      className="w-9 h-9 rounded-full"
                    />
                    <div>
                      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:underline">
                        {activeDmPeer.name}
                      </h2>
                      <p className="text-xs text-neutral-500">@{activeDmPeer.username}</p>
                    </div>
                  </Link>
                ) : (
                  <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {activeConversation.type === "group"
                      ? activeConversation.name
                      : "Direct message"}
                  </h2>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMessages ? (
                  <div className="flex justify-center py-10"><span className="loader"></span></div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-neutral-500">No messages yet.</p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg?.sender?._id === userId || msg?.sender === userId;
                    return (
                      <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className="relative max-w-[75%]">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMessageMenuId((prev) => (prev === msg._id ? null : msg._id))
                            }
                            data-msg-menu-btn
                            className={`absolute -top-2 ${isMe ? "-left-8" : "-right-8"} text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300`}
                          >
                            <i className="fi fi-bs-menu-dots text-sm"></i>
                          </button>

                          {openMessageMenuId === msg._id && (
                            <div
                              data-msg-menu
                              className={`absolute top-0 z-20 min-w-[150px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg ${
                                isMe ? "-left-40" : "left-full ml-2"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteMessage({
                                    messageId: msg._id,
                                    scope: "me",
                                    isMine: isMe,
                                  })
                                }
                                className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              >
                                Delete for me
                              </button>
                              {isMe && !msg?.isDeletedForEveryone && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteMessage({
                                      messageId: msg._id,
                                      scope: "everyone",
                                      isMine: isMe,
                                    })
                                  }
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                  Delete for everyone
                                </button>
                              )}
                            </div>
                          )}

                          <div
                            className={`px-3 py-2 rounded-2xl text-sm ${
                              isMe
                                ? "bg-primary-600 text-white"
                                : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                            }`}
                          >
                            <p className={`whitespace-pre-wrap break-words ${msg?.isDeletedForEveryone ? "italic opacity-70" : ""}`}>
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-neutral-200 dark:border-neutral-800 p-3 flex gap-2">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  type="text"
                  placeholder="Type a message"
                  className="w-full p-2 text-sm"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
              Select a conversation to start chatting.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ChatPage;
