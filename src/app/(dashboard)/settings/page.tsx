"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import { AlertCircle, RefreshCw } from "lucide-react";
import styles from "./settings.module.css";

export default function UserSettingsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

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
