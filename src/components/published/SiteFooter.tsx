import { sanitizeUrl } from "@/lib/sanitize";
import { SocialIcon } from "./SocialIcon";
import styles from "./site-layout.module.css";

interface FooterLink {
  label: string;
  url: string;
}

interface FooterColumn {
  title?: string;
  links: FooterLink[];
}

interface FooterSocialLink {
  platform: string;
  url: string;
}

interface FooterConfig {
  text?: string;
  description?: string;
  links?: FooterLink[];
  columns?: FooterColumn[];
  socialLinks?: FooterSocialLink[];
  showBranding?: boolean;
}

interface SiteFooterProps {
  siteName: string;
  footer?: FooterConfig | null;
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function FooterAnchor({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const external = isExternalUrl(href);
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export function SiteFooter({ siteName, footer }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const text = footer?.text || `\u00A9 ${year} ${siteName}`;
  const links = footer?.links || [];
  const columns = footer?.columns || [];
  const socialLinks = footer?.socialLinks || [];
  const description = footer?.description;
  const showBranding = footer?.showBranding !== false;

  const hasColumns = columns.length > 0;

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={hasColumns ? styles.footerInnerColumns : styles.footerInner}>
        {hasColumns ? (
          <>
            <div className={styles.footerTop}>
              <div className={styles.footerBrandSection}>
                <span className={styles.footerSiteName}>{siteName}</span>
                {description && <p className={styles.footerDescription}>{description}</p>}
                {socialLinks.length > 0 && (
                  <div className={styles.footerSocial}>
                    {socialLinks.map((sl, i) => (
                      <a
                        key={i}
                        href={sanitizeUrl(sl.url)}
                        className={styles.footerSocialLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={sl.platform}
                      >
                        <SocialIcon platform={sl.platform} size={18} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.footerColumnsGrid}>
                {columns.map((col, ci) => (
                  <div key={ci} className={styles.footerColumn}>
                    {col.title && <span className={styles.footerColumnTitle}>{col.title}</span>}
                    <div className={styles.footerColumnLinks}>
                      {col.links.map((link, li) => (
                        <FooterAnchor key={li} href={sanitizeUrl(link.url)} className={styles.footerLink}>
                          {link.label}
                        </FooterAnchor>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.footerBottom}>
              <span className={styles.footerText}>{text}</span>
              {showBranding && <span className={styles.footerBrand}>Built with Vellum</span>}
            </div>
          </>
        ) : (
          <>
            <span className={styles.footerText}>{text}</span>
            {links.length > 0 && (
              <div className={styles.footerLinks}>
                {links.map((link, i) => (
                  <FooterAnchor key={i} href={sanitizeUrl(link.url)} className={styles.footerLink}>
                    {link.label}
                  </FooterAnchor>
                ))}
              </div>
            )}
            {socialLinks.length > 0 && (
              <div className={styles.footerSocial}>
                {socialLinks.map((sl, i) => (
                  <a
                    key={i}
                    href={sanitizeUrl(sl.url)}
                    className={styles.footerSocialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={sl.platform}
                  >
                    <SocialIcon platform={sl.platform} size={18} />
                  </a>
                ))}
              </div>
            )}
            {showBranding && (
              <span className={styles.footerBrand}>Built with Vellum</span>
            )}
          </>
        )}
      </div>
    </footer>
  );
}
