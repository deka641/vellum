import styles from "./Breadcrumbs.module.css";

interface BreadcrumbsProps {
  siteName: string;
  siteHref: string;
  pageTitle?: string;
}

export function Breadcrumbs({ siteName, siteHref, pageTitle }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.list}>
        {pageTitle ? (
          <>
            <li className={styles.item}>
              <a href={siteHref} className={styles.link}>{siteName}</a>
            </li>
            <li className={styles.item} aria-hidden="true">
              <span className={styles.separator}>&rsaquo;</span>
            </li>
            <li className={styles.item}>
              <span className={styles.current} aria-current="page">{pageTitle}</span>
            </li>
          </>
        ) : (
          <li className={styles.item}>
            <span className={styles.current}>{siteName}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}
