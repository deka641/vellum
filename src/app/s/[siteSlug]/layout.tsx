import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";
import { sanitizeUrl } from "@/lib/sanitize";
import { parseSiteTheme, generateThemeVariables, FONT_PRESETS } from "@/lib/theme";
import { SiteHeader } from "@/components/published/SiteHeader";
import { SiteFooter } from "@/components/published/SiteFooter";
import { ReadingProgress } from "@/components/published/ReadingProgress";
import { WebSiteJsonLd } from "@/components/published/JsonLd";
import styles from "@/components/published/site-layout.module.css";
import { ScrollToTop } from "@/components/published/ScrollToTop";

interface Props {
  params: Promise<{ siteSlug: string }>;
  children: React.ReactNode;
}

export default async function PublishedSiteLayout({ params, children }: Props) {
  const { siteSlug } = await params;

  const site = await db.site.findUnique({
    where: { slug: siteSlug },
    include: {
      pages: {
        where: { status: "PUBLISHED", showInNav: true, deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, slug: true, isHomepage: true },
      },
    },
  });

  if (!site) notFound();

  const homeHref = `/s/${site.slug}`;

  const navItems = site.pages.map((page) => ({
    title: page.title,
    href: page.isHomepage ? homeHref : `/s/${site.slug}/${page.slug}`,
  }));

  const baseUrl = await getBaseUrl();
  const siteUrl = `${baseUrl}/s/${site.slug}`;

  const theme = parseSiteTheme(site.theme);
  const themeVars = theme ? generateThemeVariables(theme) : {};
  const fontPreset = theme ? FONT_PRESETS[theme.fontPreset] : null;

  return (
    <div className={styles.layout} style={themeVars as React.CSSProperties}>
      <style>{`html{scroll-behavior:smooth}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`}</style>
      <ReadingProgress />
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      {site.favicon && <link rel="icon" href={sanitizeUrl(site.favicon)} />}
      <link rel="alternate" type="application/rss+xml" title={`${site.name} RSS Feed`} href={`/s/${site.slug}/feed.xml`} />
      {fontPreset?.googleFontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontPreset.googleFontsUrl} />
        </>
      )}
      {site.customHead && (
        <div dangerouslySetInnerHTML={{ __html: site.customHead }} />
      )}
      <WebSiteJsonLd name={site.name} description={site.description} url={siteUrl} />
      <SiteHeader siteName={site.name} siteLogo={site.logo} homeHref={homeHref} navItems={navItems} siteSlug={site.slug} />
      <main id="main-content" className={styles.main}>{children}</main>
      <SiteFooter siteName={site.name} footer={site.footer as Record<string, unknown> | null} />
      {site.customFooter && (
        <div dangerouslySetInnerHTML={{ __html: site.customFooter }} />
      )}
      <ScrollToTop />
    </div>
  );
}
