import { useState } from "react";

import api from "../api/api";
import NotificationBell from "./NotificationBell";

function Sidebar({
  chats,
  selectedChat,
  onSelectChat,
  user,
  onLogout,
  userStatuses,
  onChatCreated,
}) {
  const [showNewChat, setShowNewChat] = useState(false);

  const [search, setSearch] = useState("");

  const [users, setUsers] = useState([]);

  const [searching, setSearching] = useState(false);

  const [error, setError] = useState("");

  const [showNewGroup, setShowNewGroup] = useState(false);

  const [groupName, setGroupName] = useState("");

  const [groupUsers, setGroupUsers] = useState([]);

  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const handleSearch = async () => {
    const query = search.trim();

    if (query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      setSearching(true);
      setError("");

      const response = await api.get("/users/search", {
        params: {
          q: query,
        },
      });

      const foundUsers = response.data.users || response.data || [];

      setUsers(foundUsers.filter((foundUser) => foundUser.id !== user?.id));
    } catch (error) {
      setError(error.response?.data?.error || "Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleCreatePrivateChat = async (userId) => {
    try {
      setError("");

      const response = await api.post("/chats/private", {
        userId,
      });

      const chat = response.data.chat || response.data;

      onChatCreated?.(chat);

      setShowNewChat(false);
      setSearch("");
      setUsers([]);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create chat");
    }
  };

  const handleGroupSearch = async () => {
    const query = search.trim();

    if (query.length < 2) {
      setGroupUsers([]);
      return;
    }

    try {
      setSearching(true);
      setError("");

      const response = await api.get("/users/search", {
        params: {
          q: query,
        },
      });

      const foundUsers = response.data.users || response.data || [];

      setGroupUsers(
        foundUsers.filter((foundUser) => foundUser.id !== user?.id),
      );
    } catch (error) {
      setError(error.response?.data?.error || "Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const toggleGroupMember = (userId) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();

    if (!name) {
      setError("Group name is required");
      return;
    }

    if (selectedMemberIds.length === 0) {
      setError("Select at least one member");
      return;
    }

    try {
      setError("");

      const response = await api.post("/chats/group", {
        name,
        memberIds: selectedMemberIds,
      });

      const chat = response.data.chat || response.data;

      onChatCreated?.(chat);

      setShowNewGroup(false);
      setGroupName("");
      setGroupUsers([]);
      setSelectedMemberIds([]);
      setSearch("");
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create group");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <h2>Chat App</h2>

          <p>@{user?.username}</p>
        </div>

        <div className="sidebar-header-actions">
          <NotificationBell />

          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="sidebar-toolbar">
        <div className="sidebar-title">Chats</div>

        <button
          type="button"
          className="new-chat-button"
          onClick={() => setShowNewChat((prev) => !prev)}
        >
          + New Chat
        </button>

        <button
          type="button"
          className="new-chat-button"
          onClick={() => {
            setShowNewGroup((prev) => !prev);

            setShowNewChat(false);
          }}
        >
          + New Group
        </button>
      </div>

      {showNewChat && (
        <div className="new-chat-panel">
          <div className="new-chat-search">
            <input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            <button type="button" onClick={handleSearch} disabled={searching}>
              {searching ? "..." : "Search"}
            </button>
          </div>

          {error && <div className="new-chat-error">{error}</div>}

          <div className="user-search-results">
            {users.map((foundUser) => (
              <button
                key={foundUser.id}
                type="button"
                className="user-search-item"
                onClick={() => handleCreatePrivateChat(foundUser.id)}
              >
                <div className="chat-avatar">
                  {foundUser.username?.charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong>{foundUser.username}</strong>

                  <span>{foundUser.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showNewGroup && (
        <div className="new-chat-panel">
          <input
            className="group-name-input"
            type="text"
            placeholder="Group name..."
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />

          <div className="new-chat-search">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleGroupSearch();
                }
              }}
            />

            <button
              type="button"
              onClick={handleGroupSearch}
              disabled={searching}
            >
              {searching ? "..." : "Search"}
            </button>
          </div>

          {error && <div className="new-chat-error">{error}</div>}

          <div className="user-search-results">
            {groupUsers.map((foundUser) => {
              const selected = selectedMemberIds.includes(foundUser.id);

              return (
                <button
                  key={foundUser.id}
                  type="button"
                  className={`user-search-item ${
                    selected ? "selected-user" : ""
                  }`}
                  onClick={() => toggleGroupMember(foundUser.id)}
                >
                  <div className="chat-avatar">
                    {foundUser.username?.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>{foundUser.username}</strong>

                    <span>{selected ? "Selected" : foundUser.status}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="create-group-button"
            onClick={handleCreateGroup}
          >
            Create Group
          </button>
        </div>
      )}

      <div className="chat-list">
        {chats.length === 0 ? (
          <p className="empty-text">No chats yet</p>
        ) : (
          chats.map((chat) => {
            const otherMember = chat.members?.find(
              (member) => member.userId !== user?.id,
            );

            const chatName = chat.isGroup
              ? chat.name
              : otherMember?.user?.username || "Private chat";

            const liveStatus =
              otherMember && userStatuses?.[otherMember.userId];

            const status =
              liveStatus?.status || otherMember?.user?.status || "OFFLINE";

            return (
              <button
                key={chat.id}
                className={`chat-item ${
                  selectedChat?.id === chat.id ? "active" : ""
                }`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">
                    {chatName?.charAt(0).toUpperCase()}
                  </div>

                  {!chat.isGroup && (
                    <span
                      className={`status-dot sidebar-status ${
                        status === "ONLINE" ? "online" : "offline"
                      }`}
                    />
                  )}
                </div>

                <div className="chat-info">
                  <strong>{chatName}</strong>

                  <span>{chat.isGroup ? "Group" : status}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
