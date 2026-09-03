function ChatHeader({
  chat,
  user,
  userStatuses,
}) {
  if (!chat) {
    return null;
  }

  const otherMember = chat.members?.find(
    (member) => member.userId !== user?.id,
  );

  const chatName = chat.isGroup
    ? chat.name
    : otherMember?.user?.username || "Private chat";

  let statusText = "";

  if (chat.isGroup) {
    statusText = `${chat.members?.length || 0} members`;
  } else if (otherMember) {
    const liveStatus =
      userStatuses?.[otherMember.userId];

    const status =
      liveStatus?.status ||
      otherMember.user?.status ||
      "OFFLINE";

    if (status === "ONLINE") {
      statusText = "ONLINE";
    } else {
      const lastSeen =
        liveStatus?.lastSeen ||
        otherMember.user?.lastSeen;

      if (lastSeen) {
        statusText = `Last seen ${new Date(
          lastSeen,
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      } else {
        statusText = "OFFLINE";
      }
    }
  }

  return (
    <header className="chat-header">
      <div className="chat-header-avatar-wrapper">
        <div className="chat-header-avatar">
          {chatName?.charAt(0).toUpperCase()}
        </div>

        {!chat.isGroup && (
          <span
            className={`status-dot ${
              statusText === "ONLINE"
                ? "online"
                : "offline"
            }`}
          />
        )}
      </div>

      <div>
        <h3>{chatName}</h3>

        <span>{statusText}</span>
      </div>
    </header>
  );
}

export default ChatHeader;