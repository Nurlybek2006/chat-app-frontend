import {
  useEffect,
  useState,
} from "react";

import api from "../api/api";

function GroupSettings({
  chat,
  user,
  onClose,
}) {
  const [members, setMembers] =
    useState([]);

  const [name, setName] =
    useState(chat?.name || "");

  const [search, setSearch] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const currentMember =
    chat?.members?.find(
      (member) =>
        member.userId === user?.id,
    );

  const isAdmin =
    currentMember?.role === "ADMIN";

  // --------------------------------
  // Load members
  // --------------------------------

  useEffect(() => {
    if (!chat?.id) {
      return;
    }

    const loadMembers = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/chats/${chat.id}/members`,
          );

        setMembers(
          response.data.members || [],
        );
      } catch (error) {
        setError(
          error.response?.data?.error ||
            "Failed to load members",
        );
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [chat?.id]);

  // --------------------------------
  // Rename group
  // --------------------------------

  const handleRename = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(
        "Group name is required",
      );
      return;
    }

    try {
      setError("");

      await api.patch(
        `/chats/${chat.id}`,
        {
          name: trimmedName,
        },
      );
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Failed to rename group",
      );
    }
  };

  // --------------------------------
  // Search users
  // --------------------------------

  const handleSearch = async () => {
    const query = search.trim();

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setError("");

      const response =
        await api.get(
          "/users/search",
          {
            params: {
              q: query,
            },
          },
        );

      const users =
        response.data.users ||
        response.data ||
        [];

      const memberIds =
        new Set(
          members.map(
            (member) =>
              member.userId,
          ),
        );

      setSearchResults(
        users.filter(
          (foundUser) =>
            foundUser.id !==
              user?.id &&
            !memberIds.has(
              foundUser.id,
            ),
        ),
      );
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Failed to search users",
      );
    }
  };

  // --------------------------------
  // Add member
  // --------------------------------

  const handleAddMember = async (
    memberId,
  ) => {
    try {
      setError("");

      const response =
        await api.post(
          `/chats/${chat.id}/members`,
          {
            memberId,
          },
        );

      const member =
        response.data.member;

      if (member) {
        setMembers((prev) => [
          ...prev,
          member,
        ]);
      }

      setSearchResults((prev) =>
        prev.filter(
          (item) =>
            item.id !== memberId,
        ),
      );
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Failed to add member",
      );
    }
  };

  // --------------------------------
  // Remove member
  // --------------------------------

  const handleRemoveMember = async (
    memberId,
  ) => {
    const confirmed =
      window.confirm(
        "Remove this member from group?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/chats/${chat.id}/members/${memberId}`,
      );

      setMembers((prev) =>
        prev.filter(
          (member) =>
            member.userId !==
            memberId,
        ),
      );
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Failed to remove member",
      );
    }
  };

  // --------------------------------
  // Change role
  // --------------------------------

  const handleChangeRole = async (
    memberId,
    currentRole,
  ) => {
    const newRole =
      currentRole === "ADMIN"
        ? "MEMBER"
        : "ADMIN";

    try {
      setError("");

      const response =
        await api.patch(
          `/chats/${chat.id}/members/${memberId}/role`,
          {
            role: newRole,
          },
        );

      const updatedMember =
        response.data.member;

      setMembers((prev) =>
        prev.map((member) =>
          member.userId === memberId
            ? {
                ...member,
                role:
                  updatedMember?.role ||
                  newRole,
              }
            : member,
        ),
      );
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Failed to change role",
      );
    }
  };

  return (
    <div className="group-settings-overlay">
      <div className="group-settings">
        <div className="group-settings-header">
          <h2>
            Group Settings
          </h2>

          <button
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="group-settings-error">
            {error}
          </div>
        )}

        <div className="group-settings-section">
          <h3>
            Group name
          </h3>

          <div className="group-name-edit">
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              disabled={!isAdmin}
            />

            {isAdmin && (
              <button
                type="button"
                onClick={
                  handleRename
                }
              >
                Save
              </button>
            )}
          </div>
        </div>

        <div className="group-settings-section">
          <h3>
            Members
          </h3>

          {loading ? (
            <p>
              Loading...
            </p>
          ) : (
            <div className="group-members-list">
              {members.map(
                (member) => {
                  const isCurrentUser =
                    member.userId ===
                    user?.id;

                  return (
                    <div
                      key={
                        member.userId
                      }
                      className="group-member-item"
                    >
                      <div className="group-member-main">
                        <div className="chat-avatar">
                          {member.user
                            ?.username
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {
                              member.user
                                ?.username
                            }
                          </strong>

                          <span>
                            {member.role}
                          </span>
                        </div>
                      </div>

                      {isAdmin &&
                        !isCurrentUser && (
                          <div className="group-member-actions">
                            <button
                              type="button"
                              onClick={() =>
                                handleChangeRole(
                                  member.userId,
                                  member.role,
                                )
                              }
                            >
                              {member.role ===
                              "ADMIN"
                                ? "Make Member"
                                : "Make Admin"}
                            </button>

                            <button
                              type="button"
                              className="danger-button"
                              onClick={() =>
                                handleRemoveMember(
                                  member.userId,
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        )}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="group-settings-section">
            <h3>
              Add member
            </h3>

            <div className="group-user-search">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleSearch();
                  }
                }}
              />

              <button
                type="button"
                onClick={
                  handleSearch
                }
              >
                Search
              </button>
            </div>

            <div className="group-search-results">
              {searchResults.map(
                (foundUser) => (
                  <button
                    key={
                      foundUser.id
                    }
                    type="button"
                    onClick={() =>
                      handleAddMember(
                        foundUser.id,
                      )
                    }
                  >
                    <div className="chat-avatar">
                      {foundUser.username
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {
                          foundUser.username
                        }
                      </strong>

                      <span>
                        {
                          foundUser.status
                        }
                      </span>
                    </div>
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupSettings;