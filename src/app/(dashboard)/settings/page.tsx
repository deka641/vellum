"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { useToast } from "@/components/ui/Toast/Toast";
import { AlertCircle, RefreshCw, Upload, Trash2 } from "lucide-react";
import styles from "./settings.module.css";

export default function UserSettingsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch("/api/user/profile");
      if (res.status === 405) {
        // GET not implemented, use session data
        return;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      if (data) {
        setName(data.name || "");
        setEmail(data.email || "");
        setAvatarUrl(data.avatarUrl || null);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast("Only JPEG, PNG, GIF, and WebP images are allowed", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("File too large (max 5MB)", "error");
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload immediately
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatarUrl);
        setAvatarPreview(null);
        toast("Avatar updated");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to upload avatar", "error");
        setAvatarPreview(null);
      }
    } catch {
      toast("Something went wrong", "error");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (res.ok) {
        setAvatarUrl(null);
        setAvatarPreview(null);
        toast("Avatar removed");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to remove avatar", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (res.ok) {
        toast("Profile updated");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update profile", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast("Passwords don't match", "error");
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        toast("Password changed");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to change password", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Settings" description="Manage your profile and account" />
        <div className={styles.content}>
          <div className={styles.section}>
            <Skeleton height={24} width={60} />
            <div className={styles.avatarSection}>
              <Skeleton height={80} width={80} rounded />
              <div className={styles.avatarActions}>
                <Skeleton height={36} width={130} />
              </div>
            </div>
          </div>
          <div className={styles.section}>
            <Skeleton height={24} width={80} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
          <div className={styles.section}>
            <Skeleton height={24} width={140} />
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        </div>
      </>
    );
  }

  if (fetchError) {
    return (
      <>
        <Topbar title="Settings" description="Manage your profile and account" />
        <div className={styles.content}>
          <div className={styles.errorState}>
            <AlertCircle size={32} className={styles.errorIcon} />
            <h3 className={styles.errorTitle}>Failed to load profile</h3>
            <p className={styles.errorText}>
              Something went wrong while loading your profile. Please try again.
            </p>
            <Button onClick={loadProfile} leftIcon={<RefreshCw size={16} />}>
              Try again
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Settings" description="Manage your profile and account" />
      <div className={styles.content}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Avatar</h3>
          <div className={styles.avatarSection}>
            <Avatar
              src={avatarPreview || avatarUrl}
              fallback={name || email}
              size="xl"
            />
            <div className={styles.avatarActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarSelect}
                className={styles.fileInput}
                aria-label="Upload avatar"
              />
              <Button
                type="button"
                variant="secondary"
                leftIcon={<Upload size={16} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Uploading..." : "Upload photo"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  leftIcon={<Trash2 size={16} />}
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                >
                  Remove
                </Button>
              )}
              <p className={styles.avatarHint}>
                JPEG, PNG, GIF, or WebP. Max 5MB. Will be resized to 256x256.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className={styles.section}>
          <h3 className={styles.sectionTitle}>Profile</h3>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className={styles.actions}>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>

        <form onSubmit={handleChangePassword} className={styles.section}>
          <h3 className={styles.sectionTitle}>Change Password</h3>
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div className={styles.actions}>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? "Changing..." : "Change password"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
