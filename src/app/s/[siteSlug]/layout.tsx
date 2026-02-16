import { notFound } from "next/navigation";
import { db } from "@/lib/db";
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

  return (
    <div className={styles.layout}>
      <SiteHeader siteName={site.name} homeHref={homeHref} navItems={navItems} />
      <main className={styles.main}>{children}</main>
      <SiteFooter siteName={site.name} />
    </div>
  );
}
