import { useEffect, useState } from "react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";

function Chat() {
  const { user, logout } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="center-message">
        Loading chats...
      </div>
    );
  }

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

            <div className="messages-placeholder">
              Messages will appear here
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <div>
              <h2>Select a chat</h2>
              <p>
                Choose a conversation from the sidebar.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Chat;