import { useEffect, useRef, useState } from "react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";

import { connectSocket, getSocket } from "../socket/socket";

function Chat() {
  const { user, logout } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [error, setError] = useState("");

  const [typingUsers, setTypingUsers] = useState([]);

  const [userStatuses, setUserStatuses] = useState({});

  const selectedChatRef = useRef(null);

  // --------------------------------
  // Selected chat ref
  // --------------------------------

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // --------------------------------
  // Load chats
  // --------------------------------

  useEffect(() => {
    const loadChats = async () => {
      try {
        setError("");

        const response = await api.get("/chats");

        const loadedChats = response.data.chats || [];

        setChats(loadedChats);

        // Backend-тен келген бастапқы status-тарды
        // userStatuses ішіне сақтаймыз.
        const initialStatuses = {};

        loadedChats.forEach((chat) => {
          chat.members?.forEach((member) => {
            if (!member.user?.id) {
              return;
            }

            initialStatuses[member.user.id] = {
              status: member.user.status || "OFFLINE",
              lastSeen: member.user.lastSeen || null,
            };
          });
        });

        setUserStatuses(initialStatuses);
      } catch (error) {
        setError(error.response?.data?.error || "Failed to load chats");
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  // --------------------------------
  // Socket connection + events
  // --------------------------------

  useEffect(() => {
    const socket = connectSocket();

    if (!socket) {
      return;
    }

    // --------------------------------
    // New message
    // --------------------------------

    const handleNewMessage = (payload) => {
      console.log("new-message received:", payload);

      const message = payload?.message || payload;

      if (!message?.id) {
        console.warn("Invalid new-message payload:", payload);

        return;
      }

      const currentChat = selectedChatRef.current;

      if (!currentChat || message.chatId !== currentChat.id) {
        return;
      }

      setMessages((prev) => {
        const alreadyExists = prev.some((item) => item.id === message.id);

        if (alreadyExists) {
          return prev;
        }

        return [...prev, message];
      });

      // Басқа user-ден келген message болса,
      // оны автоматты түрде READ етеміз.
      if (message.senderId !== user?.id) {
        api.patch(`/chats/messages/${message.id}/read`).catch((error) => {
          console.error("Mark message as read error:", error);
        });
      }
    };

    // --------------------------------
    // Typing start
    // --------------------------------

    const handleTypingStart = ({ chatId, userId }) => {
      const currentChat = selectedChatRef.current;

      if (!currentChat || chatId !== currentChat.id) {
        return;
      }

      if (userId === user?.id) {
        return;
      }

      setTypingUsers((prev) => {
        if (prev.includes(userId)) {
          return prev;
        }

        return [...prev, userId];
      });
    };

    // --------------------------------
    // Typing stop
    // --------------------------------

    const handleTypingStop = ({ chatId, userId }) => {
      const currentChat = selectedChatRef.current;

      if (!currentChat || chatId !== currentChat.id) {
        return;
      }

      setTypingUsers((prev) => prev.filter((id) => id !== userId));
    };

    // --------------------------------
    // User online
    // --------------------------------

    const handleUserOnline = ({ userId }) => {
      console.log("User online:", userId);

      setUserStatuses((prev) => ({
        ...prev,

        [userId]: {
          status: "ONLINE",
          lastSeen: null,
        },
      }));
    };

    // --------------------------------
    // User offline
    // --------------------------------

    const handleUserOffline = ({ userId, lastSeen }) => {
      console.log("User offline:", userId);

      setUserStatuses((prev) => ({
        ...prev,

        [userId]: {
          status: "OFFLINE",
          lastSeen,
        },
      }));
    };

    // --------------------------------
    // Socket error
    // --------------------------------

    const handleSocketError = (socketError) => {
      console.error("Socket error:", socketError);
    };

    const handleMessageRead = ({ messageId, chatId, readBy, readAt }) => {
      const currentChat = selectedChatRef.current;

      if (!currentChat || chatId !== currentChat.id) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                isRead: true,
                readAt,
              }
            : message,
        ),
      );
    };

    const handleMessagesRead = ({ chatId, messageIds, readBy, readAt }) => {
      const currentChat = selectedChatRef.current;

      if (!currentChat || chatId !== currentChat.id) {
        return;
      }

      const ids = new Set(messageIds || []);

      setMessages((prev) =>
        prev.map((message) =>
          ids.has(message.id)
            ? {
                ...message,
                isRead: true,
                readAt,
              }
            : message,
        ),
      );
    };

    // --------------------------------
    // Register listeners
    // --------------------------------

    socket.on("new-message", handleNewMessage);

    socket.on("typing-start", handleTypingStart);

    socket.on("typing-stop", handleTypingStop);

    socket.on("user-online", handleUserOnline);

    socket.on("user-offline", handleUserOffline);

    socket.on("socket-error", handleSocketError);

    socket.on("message-read", handleMessageRead);

    socket.on("messages-read", handleMessagesRead);

    // --------------------------------
    // Cleanup listeners
    // --------------------------------

    return () => {
      socket.off("new-message", handleNewMessage);

      socket.off("typing-start", handleTypingStart);

      socket.off("typing-stop", handleTypingStop);

      socket.off("user-online", handleUserOnline);

      socket.off("user-offline", handleUserOffline);

      socket.off("socket-error", handleSocketError);

      socket.off("message-read", handleMessageRead);

      socket.off("messages-read", handleMessagesRead);
    };
  }, [user?.id]);

  // --------------------------------
  // Join / Leave chat
  // --------------------------------

  useEffect(() => {
    if (!selectedChat) {
      return;
    }

    const socket = getSocket();

    if (!socket) {
      return;
    }

    const chatId = selectedChat.id;

    setTypingUsers([]);

    const joinChat = () => {
      console.log("Joining chat:", chatId);

      socket.emit("join-chat", chatId);
    };

    const handleJoinedChat = (data) => {
      console.log("Joined chat:", data.chatId);
    };

    socket.on("joined-chat", handleJoinedChat);

    if (socket.connected) {
      joinChat();
    } else {
      socket.once("connect", joinChat);
    }

    return () => {
      socket.off("joined-chat", handleJoinedChat);

      socket.off("connect", joinChat);

      if (socket.connected) {
        socket.emit("leave-chat", chatId);
      }

      setTypingUsers([]);
    };
  }, [selectedChat]);

  // --------------------------------
  // Load messages
  // --------------------------------

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        setError("");

        const response = await api.get(`/chats/${selectedChat.id}/messages`, {
          params: {
            page: 1,
            limit: 20,
          },
        });

        const receivedMessages = response.data.messages || [];

        const sortedMessages = [...receivedMessages].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );

        setMessages(sortedMessages);

        // Чат ашылған кезде
        // барлық unread message-терді оқылған деп белгілейміз.
        try {
          await api.patch(`/chats/${selectedChat.id}/read`);
        } catch (readError) {
          console.error("Mark chat as read error:", readError);
        }
      } catch (error) {
        setError(error.response?.data?.error || "Failed to load messages");
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedChat]);

  // --------------------------------
  // Send message
  // --------------------------------

  const handleSendMessage = async (content) => {
    if (!selectedChat) {
      return;
    }

    try {
      setError("");

      const response = await api.post(`/chats/${selectedChat.id}/messages`, {
        content,
      });

      const newMessage = response.data.message || response.data;

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (message) => message.id === newMessage.id,
        );

        if (alreadyExists) {
          return prev;
        }

        return [...prev, newMessage];
      });
    } catch (error) {
      setError(error.response?.data?.error || "Failed to send message");

      throw error;
    }
  };

  const handleSendFile = async (file) => {
    if (!selectedChat || !file) {
      return;
    }

    try {
      setError("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await api.post(
        `/chats/${selectedChat.id}/messages/file`,
        formData,
      );

      const newMessage = response.data.message || response.data;

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (message) => message.id === newMessage.id,
        );

        if (alreadyExists) {
          return prev;
        }

        return [...prev, newMessage];
      });
    } catch (error) {
      console.error("File upload error:", error);

      setError(error.response?.data?.error || "Failed to upload file");

      throw error;
    }
  };

  // --------------------------------
  // Typing start
  // --------------------------------

  const handleTypingStart = () => {
    if (!selectedChat) {
      return;
    }

    const socket = getSocket();

    if (!socket?.connected) {
      return;
    }

    socket.emit("typing-start", selectedChat.id);
  };

  // --------------------------------
  // Typing stop
  // --------------------------------

  const handleTypingStop = () => {
    if (!selectedChat) {
      return;
    }

    const socket = getSocket();

    if (!socket?.connected) {
      return;
    }

    socket.emit("typing-stop", selectedChat.id);
  };

  // --------------------------------
  // Logout
  // --------------------------------

  const handleLogout = () => {
    logout();
  };

  // --------------------------------
  // Loading
  // --------------------------------

  if (loading) {
    return <div className="center-message">Loading chats...</div>;
  }

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div className="chat-page">
      <Sidebar
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        user={user}
        onLogout={handleLogout}
        userStatuses={userStatuses}
      />

      <main className="chat-main">
        {error && <div className="chat-error">{error}</div>}

        {selectedChat ? (
          <>
            <ChatHeader
              chat={selectedChat}
              user={user}
              userStatuses={userStatuses}
            />

            {messagesLoading ? (
              <div className="center-message">Loading messages...</div>
            ) : (
              <MessageList messages={messages} user={user} />
            )}

            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers
                  .map((typingUserId) => {
                    const member = selectedChat?.members?.find(
                      (member) => member.userId === typingUserId,
                    );

                    return member?.user?.username || "Someone";
                  })
                  .join(", ")}{" "}
                {typingUsers.length === 1 ? "is typing..." : "are typing..."}
              </div>
            )}

            <MessageInput
              onSend={handleSendMessage}
              onSendFile={handleSendFile}
              disabled={messagesLoading}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
            />
          </>
        ) : (
          <div className="empty-chat">
            <div>
              <h2>Select a chat</h2>

              <p>Choose a conversation from the sidebar.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Chat;
