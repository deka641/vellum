"use client";

import { useState, useEffect } from "react";
import styles from "./CookieConsent.module.css";

interface CookieConsentProps {
  message?: string;
  privacyUrl?: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

const STORAGE_KEY = "vellum-cookie-consent";
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

interface ConsentRecord {
  value: "accepted" | "declined";
  timestamp: number;
}

export function CookieConsent({ message, privacyUrl, onAccept, onDecline }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
      return;
    }
    try {
      const record: ConsentRecord = JSON.parse(stored);
      if (record.timestamp && Date.now() - record.timestamp < CONSENT_TTL_MS) {
        return; // Valid, unexpired consent
      }
    } catch {
      // Invalid JSON (old format string) — treat as expired
    }
    localStorage.removeItem(STORAGE_KEY);
    setVisible(true);
  }, []);

  if (!visible) return null;

  function handleAccept() {
    const record: ConsentRecord = { value: "accepted", timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setVisible(false);
    onAccept?.();
  }

  function handleDecline() {
    const record: ConsentRecord = { value: "declined", timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setVisible(false);
    onDecline?.();
  }

  const displayMessage = message || "This site uses cookies to enhance your experience.";

  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <p className={styles.text}>
        {displayMessage}
        {privacyUrl && (
          <>
            {" "}
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </>
        )}
      </p>
      <div className={styles.buttons}>
        <button type="button" className={styles.declineButton} onClick={handleDecline}>
          Decline
        </button>
        <button type="button" className={styles.acceptButton} onClick={handleAccept}>
          Accept
        </button>
      </div>
    </div>
  );
}
