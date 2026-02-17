import { sanitizeUrl } from "@/lib/sanitize";
import styles from "./site-layout.module.css";

interface FooterLink {
  label: string;
  url: string;
}

interface FooterConfig {
  text?: string;
  links?: FooterLink[];
  showBranding?: boolean;
}

interface SiteFooterProps {
  siteName: string;
  footer?: FooterConfig | null;
}

export function SiteFooter({ siteName, footer }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const text = footer?.text || `\u00A9 ${year} ${siteName}`;
  const links = footer?.links || [];
  const showBranding = footer?.showBranding !== false;

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.footerInner}>
        <span className={styles.footerText}>{text}</span>
        {links.length > 0 && (
          <div className={styles.footerLinks}>
            {links.map((link, i) => (
              <a
                key={i}
                href={sanitizeUrl(link.url)}
                className={styles.footerLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
        {showBranding && (
          <span className={styles.footerBrand}>Built with Vellum</span>
        )}
      </div>
    </footer>
  );
}
