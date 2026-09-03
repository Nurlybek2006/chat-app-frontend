import { useEffect, useRef, useState } from "react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";

import {
  connectSocket,
  getSocket,
} from "../socket/socket";

function Chat() {
  const { user, logout } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [error, setError] = useState("");

  const [typingUsers, setTypingUsers] = useState([]);

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

        setChats(response.data.chats || []);
      } catch (error) {
        setError(
          error.response?.data?.error ||
            "Failed to load chats",
        );
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

    // NEW MESSAGE
    const handleNewMessage = (payload) => {
      console.log("new-message received:", payload);

      const message =
        payload?.message || payload;

      if (!message?.id) {
        console.warn(
          "Invalid new-message payload:",
          payload,
        );

        return;
      }

      const currentChat =
        selectedChatRef.current;

      if (
        !currentChat ||
        message.chatId !== currentChat.id
      ) {
        return;
      }

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (item) => item.id === message.id,
        );

        if (alreadyExists) {
          return prev;
        }

        return [...prev, message];
      });
    };

    // TYPING START
    const handleTypingStart = ({
      chatId,
      userId,
    }) => {
      const currentChat =
        selectedChatRef.current;

      if (
        !currentChat ||
        chatId !== currentChat.id
      ) {
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

    // TYPING STOP
    const handleTypingStop = ({
      chatId,
      userId,
    }) => {
      const currentChat =
        selectedChatRef.current;

      if (
        !currentChat ||
        chatId !== currentChat.id
      ) {
        return;
      }

      setTypingUsers((prev) =>
        prev.filter((id) => id !== userId),
      );
    };

    // SOCKET ERROR
    const handleSocketError = (
      socketError,
    ) => {
      console.error(
        "Socket error:",
        socketError,
      );
    };

    socket.on(
      "new-message",
      handleNewMessage,
    );

    socket.on(
      "typing-start",
      handleTypingStart,
    );

    socket.on(
      "typing-stop",
      handleTypingStop,
    );

    socket.on(
      "socket-error",
      handleSocketError,
    );

    return () => {
      socket.off(
        "new-message",
        handleNewMessage,
      );

      socket.off(
        "typing-start",
        handleTypingStart,
      );

      socket.off(
        "typing-stop",
        handleTypingStop,
      );

      socket.off(
        "socket-error",
        handleSocketError,
      );
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
      console.log(
        "Joining chat:",
        chatId,
      );

      socket.emit(
        "join-chat",
        chatId,
      );
    };

    const handleJoinedChat = (data) => {
      console.log(
        "Joined chat:",
        data.chatId,
      );
    };

    socket.on(
      "joined-chat",
      handleJoinedChat,
    );

    if (socket.connected) {
      joinChat();
    } else {
      socket.once(
        "connect",
        joinChat,
      );
    }

    return () => {
      socket.off(
        "joined-chat",
        handleJoinedChat,
      );

      socket.off(
        "connect",
        joinChat,
      );

      if (socket.connected) {
        socket.emit(
          "leave-chat",
          chatId,
        );
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

        const response =
          await api.get(
            `/chats/${selectedChat.id}/messages`,
            {
              params: {
                page: 1,
                limit: 20,
              },
            },
          );

        const receivedMessages =
          response.data.messages || [];

        const sortedMessages = [
          ...receivedMessages,
        ].sort(
          (a, b) =>
            new Date(a.createdAt) -
            new Date(b.createdAt),
        );

        setMessages(sortedMessages);
      } catch (error) {
        setError(
          error.response?.data?.error ||
            "Failed to load messages",
        );
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedChat]);

  // --------------------------------
  // Send message
  // --------------------------------

  const handleSendMessage = async (
    content,
  ) => {
    if (!selectedChat) {
      return;
    }

    try {
      setError("");

      const response =
        await api.post(
          `/chats/${selectedChat.id}/messages`,
          {
            content,
          },
        );

      const newMessage =
        response.data.message ||
        response.data;

      setMessages((prev) => {
        const alreadyExists =
          prev.some(
            (message) =>
              message.id ===
              newMessage.id,
          );

        if (alreadyExists) {
          return prev;
        }

        return [
          ...prev,
          newMessage,
        ];
      });
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Failed to send message",
      );

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

    socket.emit(
      "typing-start",
      selectedChat.id,
    );
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

    socket.emit(
      "typing-stop",
      selectedChat.id,
    );
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
    return (
      <div className="center-message">
        Loading chats...
      </div>
    );
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
      />

      <main className="chat-main">
        {error && (
          <div className="chat-error">
            {error}
          </div>
        )}

        {selectedChat ? (
          <>
            <ChatHeader
              chat={selectedChat}
              user={user}
            />

            {messagesLoading ? (
              <div className="center-message">
                Loading messages...
              </div>
            ) : (
              <MessageList
                messages={messages}
                user={user}
              />
            )}

            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                Someone is typing...
              </div>
            )}

            <MessageInput
              onSend={handleSendMessage}
              disabled={messagesLoading}
              onTypingStart={
                handleTypingStart
              }
              onTypingStop={
                handleTypingStop
              }
            />
          </>
        ) : (
          <div className="empty-chat">
            <div>
              <h2>Select a chat</h2>

              <p>
                Choose a conversation
                from the sidebar.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Chat;