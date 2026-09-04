import { useEffect, useRef, useState } from "react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";

import { connectSocket, getSocket } from "../socket/socket";

import ProfileSettings from "../components/ProfileSettings";

import GroupSettings from "../components/GroupSettings";

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
  const [replyTo, setReplyTo] = useState(null);

  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const [editingMessage, setEditingMessage] = useState(null);

  const selectedChatRef = useRef(null);

  // --------------------------------
  // Selected chat ref
  // --------------------------------

  useEffect(() => {
    selectedChatRef.current = selectedChat;

    setReplyTo(null);
    setShowGroupSettings(false);
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
      setUserStatuses((prev) => ({
        ...prev,

        [userId]: {
          status: "OFFLINE",
          lastSeen,
        },
      }));
    };

    // --------------------------------
    // Message read
    // --------------------------------

    const handleMessageRead = ({ messageId, chatId, readAt }) => {
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

    // --------------------------------
    // Messages read
    // --------------------------------

    const handleMessagesRead = ({ chatId, messageIds, readAt }) => {
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
    // Chat added
    // --------------------------------

    const handleChatAdded = async ({ chatId }) => {
      if (!chatId) {
        return;
      }

      try {
        const response = await api.get(`/chats/${chatId}`);

        const chat = response.data.chat || response.data;

        if (!chat?.id) {
          return;
        }

        setChats((prev) => {
          const exists = prev.some((item) => item.id === chat.id);

          if (exists) {
            return prev.map((item) =>
              item.id === chat.id
                ? {
                    ...item,
                    ...chat,
                  }
                : item,
            );
          }

          return [chat, ...prev];
        });

        setUserStatuses((prev) => {
          const next = { ...prev };

          chat.members?.forEach((member) => {
            if (!member.user?.id) {
              return;
            }

            next[member.user.id] = {
              status: member.user.status || "OFFLINE",

              lastSeen: member.user.lastSeen || null,
            };
          });

          return next;
        });

        console.log("Chat added:", chat.id);
      } catch (error) {
        console.error("Failed to load added chat:", error);
      }
    };

    // --------------------------------
    // Chat updated
    // --------------------------------

    const handleChatUpdated = async ({ chatId }) => {
      if (!chatId) {
        return;
      }

      try {
        const response = await api.get(`/chats/${chatId}`);

        const updatedChat = response.data.chat || response.data;

        if (!updatedChat?.id) {
          return;
        }

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === updatedChat.id
              ? {
                  ...chat,
                  ...updatedChat,
                }
              : chat,
          ),
        );

        setSelectedChat((prev) => {
          if (!prev || prev.id !== updatedChat.id) {
            return prev;
          }

          return {
            ...prev,
            ...updatedChat,
          };
        });

        setUserStatuses((prev) => {
          const next = { ...prev };

          updatedChat.members?.forEach((member) => {
            if (!member.user?.id) {
              return;
            }

            next[member.user.id] = {
              status: member.user.status || "OFFLINE",

              lastSeen: member.user.lastSeen || null,
            };
          });

          return next;
        });

        console.log("Chat updated:", chatId);
      } catch (error) {
        console.error("Failed to update chat:", error);
      }
    };

    // --------------------------------
    // Chat removed
    // --------------------------------

    const handleChatRemoved = ({ chatId }) => {
      if (!chatId) {
        return;
      }

      setChats((prev) => prev.filter((chat) => chat.id !== chatId));

      setSelectedChat((prev) => {
        if (prev?.id === chatId) {
          return null;
        }

        return prev;
      });

      const currentChat = selectedChatRef.current;

      if (currentChat?.id === chatId) {
        setMessages([]);
        setTypingUsers([]);
        setReplyTo(null);
      }

      console.log("Chat removed:", chatId);
    };

    // --------------------------------
    // Member role updated
    // --------------------------------

    const handleMemberRoleUpdated = ({ chatId, memberId, role }) => {
      if (!chatId || !memberId || !role) {
        return;
      }

      const updateChat = (chat) => {
        if (!chat || chat.id !== chatId) {
          return chat;
        }

        return {
          ...chat,

          members:
            chat.members?.map((member) =>
              member.userId === memberId
                ? {
                    ...member,
                    role,
                  }
                : member,
            ) || [],
        };
      };

      setChats((prev) => prev.map(updateChat));

      setSelectedChat((prev) => updateChat(prev));

      console.log("Member role updated:", {
        chatId,
        memberId,
        role,
      });
    };

    // --------------------------------
    // Socket error
    // --------------------------------

    const handleSocketError = (socketError) => {
      console.error("Socket error:", socketError);
    };

    const handleMessageUpdated = ({ message }) => {
      if (!message?.id) {
        return;
      }

      const currentChat = selectedChatRef.current;

      if (!currentChat || message.chatId !== currentChat.id) {
        return;
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                ...message,
              }
            : item,
        ),
      );
    };

    const handleMessageDeleted = ({ messageId, chatId }) => {
      if (!messageId || !chatId) {
        return;
      }

      const currentChat = selectedChatRef.current;

      if (!currentChat || currentChat.id !== chatId) {
        return;
      }

      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    };

    // --------------------------------
    // Register listeners
    // --------------------------------

    socket.on("new-message", handleNewMessage);

    socket.on("typing-start", handleTypingStart);

    socket.on("typing-stop", handleTypingStop);

    socket.on("user-online", handleUserOnline);

    socket.on("user-offline", handleUserOffline);

    socket.on("message-read", handleMessageRead);

    socket.on("messages-read", handleMessagesRead);

    socket.on("chat-added", handleChatAdded);

    socket.on("chat-updated", handleChatUpdated);

    socket.on("chat-removed", handleChatRemoved);

    socket.on("member-role-updated", handleMemberRoleUpdated);

    socket.on("socket-error", handleSocketError);

    socket.on("message-updated", handleMessageUpdated);

    socket.on("message-deleted", handleMessageDeleted);

    // --------------------------------
    // Cleanup listeners
    // --------------------------------

    return () => {
      socket.off("new-message", handleNewMessage);

      socket.off("typing-start", handleTypingStart);

      socket.off("typing-stop", handleTypingStop);

      socket.off("user-online", handleUserOnline);

      socket.off("user-offline", handleUserOffline);

      socket.off("message-read", handleMessageRead);

      socket.off("messages-read", handleMessagesRead);

      socket.off("chat-added", handleChatAdded);

      socket.off("chat-updated", handleChatUpdated);

      socket.off("chat-removed", handleChatRemoved);

      socket.off("member-role-updated", handleMemberRoleUpdated);

      socket.off("socket-error", handleSocketError);

      socket.off("message-updated", handleMessageUpdated);

      socket.off("message-deleted", handleMessageDeleted);
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

      const body = {
        content,
      };

      if (replyTo?.id) {
        body.replyToId = replyTo.id;
      }

      const response = await api.post(
        `/chats/${selectedChat.id}/messages`,
        body,
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

      setReplyTo(null);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to send message");

      throw error;
    }
  };

  // --------------------------------
  // Send file
  // --------------------------------

  const handleSendFile = async (file) => {
    if (!selectedChat || !file) {
      return;
    }

    try {
      setError("");

      const formData = new FormData();

      formData.append("file", file);

      if (replyTo?.id) {
        formData.append("replyToId", replyTo.id);
      }

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

      setReplyTo(null);
    } catch (error) {
      console.error("File upload error:", error);

      setError(error.response?.data?.error || "Failed to upload file");

      throw error;
    }
  };

  // --------------------------------
  // Edit message
  // --------------------------------

  const handleEditMessage = async (message) => {
    const newContent = window.prompt("Edit message:", message.content);

    if (!newContent?.trim()) {
      return;
    }

    try {
      setError("");

      const response = await api.patch(`/chats/messages/${message.id}`, {
        content: newContent.trim(),
      });

      const updatedMessage = response.data.message || response.data;

      setMessages((prev) =>
        prev.map((item) =>
          item.id === updatedMessage.id
            ? {
                ...item,
                ...updatedMessage,
              }
            : item,
        ),
      );
    } catch (error) {
      setError(error.response?.data?.error || "Failed to edit message");
    }
  };

  // --------------------------------
  // Delete message
  // --------------------------------

  const handleDeleteMessage = async (message) => {
    const confirmed = window.confirm("Delete this message?");

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/chats/messages/${message.id}`);

      setMessages((prev) => prev.filter((item) => item.id !== message.id));
    } catch (error) {
      setError(error.response?.data?.error || "Failed to delete message");
    }
  };

  // --------------------------------
  // Chat created
  // --------------------------------

  const handleChatCreated = (chat) => {
    if (!chat?.id) {
      return;
    }

    setChats((prev) => {
      const exists = prev.some((item) => item.id === chat.id);

      if (exists) {
        return prev.map((item) =>
          item.id === chat.id
            ? {
                ...item,
                ...chat,
              }
            : item,
        );
      }

      return [chat, ...prev];
    });

    setUserStatuses((prev) => {
      const next = {
        ...prev,
      };

      chat.members?.forEach((member) => {
        if (!member.user?.id) {
          return;
        }

        next[member.user.id] = {
          status: member.user.status || "OFFLINE",

          lastSeen: member.user.lastSeen || null,
        };
      });

      return next;
    });

    setSelectedChat(chat);
    setReplyTo(null);
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
    <div className={`chat-page ${selectedChat ? "chat-selected" : ""}`}>
      <Sidebar
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        user={user}
        onLogout={handleLogout}
        userStatuses={userStatuses}
        onChatCreated={handleChatCreated}
        onOpenProfile={() => setShowProfileSettings(true)}
      />

      <main className="chat-main">
        {error && <div className="chat-error">{error}</div>}

        {selectedChat ? (
          <>
            <ChatHeader
              chat={selectedChat}
              user={user}
              userStatuses={userStatuses}
              onOpenGroupSettings={() => setShowGroupSettings(true)}
              onBack={() => setSelectedChat(null)}
            />

            {messagesLoading ? (
              <div className="center-message">Loading messages...</div>
            ) : (
              <MessageList
                messages={messages}
                user={user}
                onReply={setReplyTo}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
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
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
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

      {showGroupSettings && selectedChat?.isGroup && (
        <GroupSettings
          chat={selectedChat}
          user={user}
          onClose={() => setShowGroupSettings(false)}
        />
      )}

      {showProfileSettings && (
        <ProfileSettings
          user={user}
          onClose={() => setShowProfileSettings(false)}
          onUpdated={(updatedUser) => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

export default Chat;
