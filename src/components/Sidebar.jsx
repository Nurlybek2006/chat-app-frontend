import NotificationBell from "./NotificationBell";

function Sidebar({
  chats,
  selectedChat,
  onSelectChat,
  user,
  onLogout,
  userStatuses,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NotificationBell />
        <div>
          <h2>Chat App</h2>
          <p>@{user?.username}</p>
        </div>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>

      <div className="sidebar-title">
        Chats
      </div>

      <div className="chat-list">
        {chats.length === 0 ? (
          <p className="empty-text">
            No chats yet
          </p>
        ) : (
          chats.map((chat) => {
            const otherMember =
              chat.members?.find(
                (member) =>
                  member.userId !== user?.id,
              );

            const chatName = chat.isGroup
              ? chat.name
              : otherMember?.user?.username ||
                "Private chat";

            const liveStatus =
              otherMember &&
              userStatuses?.[
                otherMember.userId
              ];

            const status =
              liveStatus?.status ||
              otherMember?.user?.status ||
              "OFFLINE";

            return (
              <button
                key={chat.id}
                className={`chat-item ${
                  selectedChat?.id === chat.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  onSelectChat(chat)
                }
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">
                    {chatName
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  {!chat.isGroup && (
                    <span
                      className={`status-dot sidebar-status ${
                        status === "ONLINE"
                          ? "online"
                          : "offline"
                      }`}
                    />
                  )}
                </div>

                <div className="chat-info">
                  <strong>
                    {chatName}
                  </strong>

                  <span>
                    {chat.isGroup
                      ? "Group"
                      : status}
                  </span>
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