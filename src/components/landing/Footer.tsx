import Link from "next/link";
import styles from "./landing.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>Vellum</span>
            <span className={styles.footerTagline}>
              Crafted with care. Built for creators.
            </span>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerLinkGroup}>
              <h4 className={styles.footerLinkTitle}>Product</h4>
              <Link href="/register" className={styles.footerLink}>Get Started</Link>
              <Link href="/login" className={styles.footerLink}>Sign In</Link>
            </div>
            <div className={styles.footerLinkGroup}>
              <h4 className={styles.footerLinkTitle}>Resources</h4>
              <Link href="#features" className={styles.footerLink}>Features</Link>
              <Link href="/register" className={styles.footerLink}>Create Free Account</Link>
            </div>
            <div className={styles.footerLinkGroup}>
              <h4 className={styles.footerLinkTitle}>Legal</h4>
              <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerDivider} />
        <div className={styles.footerBottom}>
          <span className={styles.footerCopy}>
            &copy; {new Date().getFullYear()} Vellum. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
