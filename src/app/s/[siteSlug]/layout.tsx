import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseSiteTheme, generateThemeVariables, FONT_PRESETS } from "@/lib/theme";
import { SiteHeader } from "@/components/published/SiteHeader";
import { SiteFooter } from "@/components/published/SiteFooter";
import styles from "@/components/published/site-layout.module.css";

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
        where: { status: "PUBLISHED", showInNav: true },
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

  const theme = parseSiteTheme(site.theme);
  const themeVars = theme ? generateThemeVariables(theme) : {};
  const fontPreset = theme ? FONT_PRESETS[theme.fontPreset] : null;

  return (
    <div className={styles.layout} style={themeVars as React.CSSProperties}>
      {fontPreset?.googleFontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontPreset.googleFontsUrl} />
        </>
      )}
      <SiteHeader siteName={site.name} homeHref={homeHref} navItems={navItems} />
      <main className={styles.main}>{children}</main>
      <SiteFooter siteName={site.name} />
    </div>
  );
}
