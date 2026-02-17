"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "../auth.module.css";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <h2 className={styles.title}>Password reset</h2>
        <p className={styles.subtitle}>
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
        <Link href="/login">
          <Button fullWidth className={styles.submitButton}>
            Sign in
          </Button>
        </Link>
      </>
    );
  }

  if (!token) {
    return (
      <>
        <h2 className={styles.title}>Invalid link</h2>
        <p className={styles.subtitle}>
          This password reset link is invalid or has expired.
          Please request a new one.
        </p>
        <p className={styles.footer}>
          <Link href="/forgot-password">Request new link</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className={styles.title}>Set new password</h2>
      <p className={styles.subtitle}>
        Enter your new password below.
      </p>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="password"
          label="New password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Input
          type="password"
          label="Confirm new password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Button
          type="submit"
          fullWidth
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>

      <p className={styles.footer}>
        Remember your password?{" "}
        <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
