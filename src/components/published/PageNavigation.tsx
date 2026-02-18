import styles from "./PageNavigation.module.css";

interface PageLink {
  title: string;
  href: string;
}

interface PageNavigationProps {
  prevPage: PageLink | null;
  nextPage: PageLink | null;
}

export function PageNavigation({ prevPage, nextPage }: PageNavigationProps) {
  if (!prevPage && !nextPage) return null;

  return (
    <nav aria-label="Page navigation" className={styles.nav}>
      {prevPage ? (
        <a href={prevPage.href} className={`${styles.link} ${styles.linkPrev}`}>
          <span className={styles.label}>&larr; Previous</span>
          <span className={styles.title}>{prevPage.title}</span>
        </a>
      ) : (
        <span />
      )}
      {nextPage ? (
        <a href={nextPage.href} className={`${styles.link} ${styles.linkNext}`}>
          <span className={styles.label}>Next &rarr;</span>
          <span className={styles.title}>{nextPage.title}</span>
        </a>
      ) : null}
    </nav>
  );
}
