import { useEffect, useState } from "react";

import api from "../api/api";

function ProfileSettings({ user, onClose, onUpdated }) {
  const [username, setUsername] = useState(user?.username || "");

  const [avatar, setAvatar] = useState(user?.avatar || "");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    setUsername(user?.username || "");
    setAvatar(user?.avatar || "");
  }, [user]);

  const handleSave = async () => {
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setError("Username must be between 3 and 30 characters");

      return;
    }

    try {
      setSaving(true);
      setError("");

      const body = {
        username: trimmedUsername,
      };

      if (avatar.trim()) {
        body.avatar = avatar.trim();
      }

      const response = await api.patch("/users/me", body);

      const updatedUser = response.data.user || response.data;

      onUpdated?.(updatedUser);
      onClose?.();
    } catch (error) {
      setError(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-overlay">
      <div className="profile-settings">
        <div className="profile-header">
          <h2>Profile</h2>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="profile-error">{error}</div>}

        <div className="profile-body">
          <label>Username</label>

          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label>Avatar URL</label>

          <input
            type="text"
            value={avatar}
            onChange={(event) => setAvatar(event.target.value)}
            placeholder="https://..."
          />

          {avatar && (
            <img
              className="profile-avatar-preview"
              src={avatar}
              alt="Avatar preview"
            />
          )}

          <button
            type="button"
            className="profile-save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
