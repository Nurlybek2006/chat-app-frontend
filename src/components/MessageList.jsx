import {
  useEffect,
  useRef,
} from "react";

function MessageList({
  messages,
  user,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        No messages yet
      </div>
    );
  }

  const sortedMessages = [
    ...messages,
  ].sort(
    (a, b) =>
      new Date(a.createdAt) -
      new Date(b.createdAt),
  );

  return (
    <div className="message-list">
      {sortedMessages.map(
        (message) => {
          const isMine =
            message.senderId === user?.id;

          return (
            <div
              key={message.id}
              className={`message-row ${
                isMine
                  ? "mine"
                  : "other"
              }`}
            >
              <div className="message-bubble">
                {!isMine && (
                  <div className="message-sender">
                    {message.sender
                      ?.username ||
                      "User"}
                  </div>
                )}

                {message.replyTo && (
                  <div className="reply-box">
                    <strong>
                      {message.replyTo
                        .sender
                        ?.username ||
                        "User"}
                    </strong>

                    <span>
                      {
                        message.replyTo
                          .content
                      }
                    </span>
                  </div>
                )}

                {message.type ===
                  "TEXT" && (
                  <div className="message-content">
                    {
                      message.content
                    }
                  </div>
                )}

                {message.type ===
                  "IMAGE" &&
                  message.fileUrl && (
                    <img
                      className="message-image"
                      src={`http://localhost:3000${message.fileUrl}`}
                      alt={
                        message.fileName ||
                        "image"
                      }
                    />
                  )}

                {message.type ===
                  "FILE" &&
                  message.fileUrl && (
                    <a
                      className="message-file"
                      href={`http://localhost:3000${message.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📎{" "}
                      {message.fileName ||
                        "Download file"}
                    </a>
                  )}

                <div className="message-meta">
                  <span>
                    {new Date(
                      message.createdAt,
                    ).toLocaleTimeString(
                      [],
                      {
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                      },
                    )}
                  </span>

                  {isMine && (
                    <span>
                      {message.isRead
                        ? "✓✓"
                        : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;