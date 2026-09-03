import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";
import { getSocket } from "../socket/socket";

function NotificationBell() {
  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [isOpen, setIsOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // --------------------------------
  // Load unread count
  // --------------------------------

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response =
          await api.get(
            "/notifications/unread-count",
          );

        setUnreadCount(
          response.data.count || 0,
        );
      } catch (error) {
        console.error(
          "Unread count error:",
          error,
        );
      }
    };

    loadUnreadCount();
  }, []);

  // --------------------------------
  // Socket notification
  // --------------------------------

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const handleNewNotification = (
      payload,
    ) => {
      const notification =
        payload?.notification ||
        payload;

      if (!notification?.id) {
        return;
      }

      setNotifications((prev) => {
        const exists = prev.some(
          (item) =>
            item.id ===
            notification.id,
        );

        if (exists) {
          return prev;
        }

        return [
          notification,
          ...prev,
        ];
      });

      setUnreadCount(
        (prev) => prev + 1,
      );
    };

    socket.on(
      "new-notification",
      handleNewNotification,
    );

    return () => {
      socket.off(
        "new-notification",
        handleNewNotification,
      );
    };
  }, []);

  // --------------------------------
  // Load notifications
  // --------------------------------

  const loadNotifications =
    async () => {
      try {
        setLoading(true);

        const response =
          await api.get(
            "/notifications",
          );

        setNotifications(
          response.data.notifications ||
            response.data ||
            [],
        );
      } catch (error) {
        console.error(
          "Load notifications error:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

  // --------------------------------
  // Toggle
  // --------------------------------

  const handleToggle = async () => {
    const nextState = !isOpen;

    setIsOpen(nextState);

    if (nextState) {
      await loadNotifications();
    }
  };

  // --------------------------------
  // Mark one as read
  // --------------------------------

  const handleMarkAsRead = async (
    notificationId,
  ) => {
    try {
      await api.patch(
        `/notifications/${notificationId}/read`,
      );

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id ===
          notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification,
        ),
      );

      setUnreadCount((prev) =>
        Math.max(prev - 1, 0),
      );
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error,
      );
    }
  };

  // --------------------------------
  // Mark all as read
  // --------------------------------

  const handleMarkAllAsRead =
    async () => {
      try {
        await api.patch(
          "/notifications/read-all",
        );

        setNotifications((prev) =>
          prev.map(
            (notification) => ({
              ...notification,
              isRead: true,
            }),
          ),
        );

        setUnreadCount(0);
      } catch (error) {
        console.error(
          "Mark all read error:",
          error,
        );
      }
    };

  // --------------------------------
  // Delete notification
  // --------------------------------

  const handleDelete = async (
    notificationId,
  ) => {
    try {
      const target =
        notifications.find(
          (notification) =>
            notification.id ===
            notificationId,
        );

      await api.delete(
        `/notifications/${notificationId}`,
      );

      setNotifications((prev) =>
        prev.filter(
          (notification) =>
            notification.id !==
            notificationId,
        ),
      );

      if (
        target &&
        !target.isRead
      ) {
        setUnreadCount((prev) =>
          Math.max(prev - 1, 0),
        );
      }
    } catch (error) {
      console.error(
        "Delete notification error:",
        error,
      );
    }
  };

  return (
    <div className="notification-wrapper">
      <button
        className="notification-bell"
        onClick={handleToggle}
        type="button"
      >
        🔔

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <strong>
              Notifications
            </strong>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={
                  handleMarkAllAsRead
                }
              >
                Read all
              </button>
            )}
          </div>

          {loading ? (
            <div className="notification-empty">
              Loading...
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="notification-empty">
              No notifications
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(
                (notification) => (
                  <div
                    key={
                      notification.id
                    }
                    className={`notification-item ${
                      notification.isRead
                        ? "read"
                        : "unread"
                    }`}
                  >
                    <div className="notification-content">
                      <strong>
                        {
                          notification.title
                        }
                      </strong>

                      <p>
                        {
                          notification.content
                        }
                      </p>

                      <small>
                        {new Date(
                          notification.createdAt,
                        ).toLocaleString()}
                      </small>
                    </div>

                    <div className="notification-actions">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() =>
                            handleMarkAsRead(
                              notification.id,
                            )
                          }
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            notification.id,
                          )
                        }
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;