"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
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

  if (submitted) {
    return (
      <>
        <h2 className={styles.title}>Check your email</h2>
        <p className={styles.subtitle}>
          If an account with that email exists, we&apos;ve sent a password reset link.
          Check your email and follow the instructions.
        </p>
        <p className={styles.footer}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className={styles.title}>Reset your password</h2>
      <p className={styles.subtitle}>
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Button
          type="submit"
          fullWidth
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className={styles.footer}>
        Remember your password?{" "}
        <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}
