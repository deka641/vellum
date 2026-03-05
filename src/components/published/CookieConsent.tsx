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

export function CookieConsent({ message, privacyUrl, onAccept, onDecline }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
    onAccept?.();
  }

  function handleDecline() {
    localStorage.setItem(STORAGE_KEY, "declined");
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
