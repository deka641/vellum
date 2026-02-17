import type { Metadata } from "next";
import Link from "next/link";
import styles from "../privacy/privacy.module.css";

export const metadata: Metadata = {
  title: "Terms of Service - Vellum",
  description: "Terms of service for Vellum CMS",
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoText}>Vellum</Link>
        </div>

        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: February 2026</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Acceptance of Terms</h2>
          <p className={styles.text}>
            By accessing or using Vellum, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our service.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Use of Service</h2>
          <p className={styles.text}>
            You may use Vellum to create, manage, and publish websites. You are responsible for
            all content you create and publish through the platform. You agree not to use the
            service for any unlawful purpose or in any way that could damage or impair the service.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account Responsibilities</h2>
          <p className={styles.text}>
            You are responsible for maintaining the confidentiality of your account credentials
            and for all activities that occur under your account. You must notify us immediately
            of any unauthorized use of your account.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Content Ownership</h2>
          <p className={styles.text}>
            You retain all rights to the content you create using Vellum. We do not claim ownership
            of your websites, pages, text, images, or other materials. You grant us a limited license
            to host and display your content as part of providing the service.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Service Availability</h2>
          <p className={styles.text}>
            We strive to maintain high availability of our service but do not guarantee
            uninterrupted access. We may modify, suspend, or discontinue any aspect of the
            service at any time with reasonable notice.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Termination</h2>
          <p className={styles.text}>
            We reserve the right to suspend or terminate your account if you violate these terms
            or engage in harmful behavior. You may delete your account at any time through your
            account settings.
          </p>
        </div>

        <Link href="/" className={styles.backLink}>
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
