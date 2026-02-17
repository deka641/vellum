import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy - Vellum",
  description: "Privacy policy for Vellum CMS",
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoText}>Vellum</Link>
        </div>

        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: February 2026</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Information We Collect</h2>
          <p className={styles.text}>
            We collect information you provide directly to us, such as when you create an account,
            build a website, upload media, or contact us. This includes your name, email address,
            and any content you create using our platform.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>How We Use Your Information</h2>
          <p className={styles.text}>
            We use the information we collect to provide, maintain, and improve our services,
            to process your requests, and to communicate with you about your account and our services.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data Storage and Security</h2>
          <p className={styles.text}>
            We implement appropriate technical and organizational measures to protect your personal
            data against unauthorized access, alteration, disclosure, or destruction. Your content
            and account data are stored securely in our databases.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Rights</h2>
          <p className={styles.text}>
            You have the right to access, update, or delete your personal information at any time
            through your account settings. You can also request a copy of your data or ask us to
            delete your account entirely.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Cookies</h2>
          <p className={styles.text}>
            We use essential cookies to maintain your session and preferences. We do not use
            third-party tracking cookies or advertising cookies.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Changes to This Policy</h2>
          <p className={styles.text}>
            We may update this privacy policy from time to time. We will notify you of any
            changes by posting the new policy on this page and updating the &quot;last updated&quot; date.
          </p>
        </div>

        <Link href="/" className={styles.backLink}>
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
