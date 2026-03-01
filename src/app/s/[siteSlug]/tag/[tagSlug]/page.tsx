import { cache } from "react";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";
import styles from "./tag.module.css";

const getSite = cache((slug: string) =>
  db.site.findUnique({ where: { slug } })
);

const getTag = cache((siteId: string, tagSlug: string) =>
  db.tag.findFirst({
    where: { siteId, slug: tagSlug },
  })
);

const getTaggedPages = cache((tagId: string, siteId: string) =>
  db.page.findMany({
    where: {
      siteId,
      status: "PUBLISHED",
      deletedAt: null,
      pageTags: { some: { tagId } },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isHomepage: true,
      publishedAt: true,
    },
  })
);

export const revalidate = 3600;

interface Props {
  params: Promise<{ siteSlug: string; tagSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug, tagSlug } = await params;

  const site = await getSite(siteSlug);
  if (!site) return {};

  const tag = await getTag(site.id, tagSlug);
  if (!tag) return {};

  const baseUrl = await getBaseUrl();
  const canonical = `${baseUrl}/s/${siteSlug}/tag/${tagSlug}`;

  return {
    title: `Posts tagged "${tag.name}" - ${site.name}`,
    description: `All pages tagged with "${tag.name}" on ${site.name}`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `Posts tagged "${tag.name}"`,
      siteName: site.name,
    },
  };
}

export default async function TagPage({ params }: Props) {
  const { siteSlug, tagSlug } = await params;

  const site = await getSite(siteSlug);
  if (!site) notFound();

  const tag = await getTag(site.id, tagSlug);
  if (!tag) notFound();

  const pages = await getTaggedPages(tag.id, site.id);

  const homeHref = `/s/${siteSlug}`;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <ol className={styles.breadcrumbList}>
            <li>
              <Link href={homeHref} className={styles.breadcrumbLink}>
                {site.name}
              </Link>
            </li>
            <li aria-hidden="true" className={styles.breadcrumbSep}>/</li>
            <li aria-current="page" className={styles.breadcrumbCurrent}>
              Tag: {tag.name}
            </li>
          </ol>
        </nav>

        <header className={styles.header}>
          <span className={styles.tagBadge}>{tag.name}</span>
          <h1 className={styles.title}>
            Posts tagged &ldquo;{tag.name}&rdquo;
          </h1>
          <p className={styles.count}>
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </p>
        </header>

        {pages.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No published pages with this tag yet.</p>
            <Link href={homeHref} className={styles.homeLink}>
              Back to homepage
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {pages.map((p) => {
              const href = p.isHomepage ? homeHref : `/s/${siteSlug}/${p.slug}`;
              return (
                <Link key={p.id} href={href} className={styles.card}>
                  <h2 className={styles.cardTitle}>{p.title}</h2>
                  {p.description && (
                    <p className={styles.cardDescription}>{p.description}</p>
                  )}
                  {p.publishedAt && (
                    <time className={styles.cardDate} dateTime={new Date(p.publishedAt).toISOString()}>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(p.publishedAt))}
                    </time>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
