function ChatHeader({ chat, user }) {
  if (!chat) {
    return null;
  }

  const otherMember = chat.members?.find(
    (member) => member.userId !== user?.id,
  );

  const chatName = chat.isGroup
    ? chat.name
    : otherMember?.user?.username || "Private chat";

  return (
    <header className="chat-header">
      <div className="chat-header-avatar">
        {chatName?.charAt(0).toUpperCase()}
      </div>

      <div>
        <h3>{chatName}</h3>

        <span>
          {chat.isGroup
            ? `${chat.members?.length || 0} members`
            : otherMember?.user?.status || "OFFLINE"}
        </span>
      </div>
    </header>
  );
}

export default ChatHeader;