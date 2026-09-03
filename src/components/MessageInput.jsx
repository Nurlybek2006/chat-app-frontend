import {
  useEffect,
  useRef,
  useState,
} from "react";

function MessageInput({
  onSend,
  onSendFile,
  disabled,
  onTypingStart,
  onTypingStop,
}) {
  const [content, setContent] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const typingTimeoutRef =
    useRef(null);

  const isTypingRef =
    useRef(false);

  const fileInputRef =
    useRef(null);

  const handleChange = (event) => {
    const value = event.target.value;

    setContent(value);

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current,
        );
      }

      if (isTypingRef.current) {
        isTypingRef.current = false;

        onTypingStop?.();
      }

      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;

      onTypingStart?.();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current,
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current =
            false;

          onTypingStop?.();
        }
      }, 1200);
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    const trimmedContent =
      content.trim();

    if (
      !trimmedContent ||
      sending ||
      disabled
    ) {
      return;
    }

    try {
      setSending(true);

      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current,
        );
      }

      if (isTypingRef.current) {
        isTypingRef.current = false;

        onTypingStop?.();
      }

      await onSend(trimmedContent);

      setContent("");
    } finally {
      setSending(false);
    }
  };

  const handleFileButtonClick = () => {
    if (disabled || sending) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setSending(true);

      await onSendFile?.(file);
    } finally {
      setSending(false);

      event.target.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current,
        );
      }
    };
  }, []);

  return (
    <form
      className="message-input-container"
      onSubmit={handleSubmit}
    >
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
      />

      <button
        type="button"
        className="file-button"
        onClick={
          handleFileButtonClick
        }
        disabled={
          disabled || sending
        }
      >
        📎
      </button>

      <input
        type="text"
        placeholder="Type a message..."
        value={content}
        onChange={handleChange}
        disabled={
          disabled || sending
        }
      />

      <button
        type="submit"
        disabled={
          disabled ||
          sending ||
          !content.trim()
        }
      >
        {sending
          ? "Sending..."
          : "Send"}
      </button>
    </form>
  );
}

export default MessageInput;