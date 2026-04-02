import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Globe, FileText, Send, Image as ImageIcon, Plus, Upload, LayoutTemplate, FileEdit, Inbox, CheckCircle, Mail, Eye } from "lucide-react";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Topbar } from "@/components/dashboard/Topbar";
import { GettingStarted } from "@/components/dashboard/GettingStarted";
import { formatDate } from "@/lib/utils";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ContentHealth } from "@/components/dashboard/ContentHealth";
import styles from "./home.module.css";

interface SiteOverview {
  id: string;
  name: string;
  slug: string;
  updatedAt: Date;
  pageCount: number;
  publishedCount: number;
  submissionCount: number;
}

const getDashboardData = unstable_cache(
  async (userId: string) => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [siteCount, pageCounts, submissionCount, unreadSubmissionCount, mediaCount, totalPageViews, recentPages, recentSubmissions, firstSite, sites, staleBySite, missingDescBySite, draftBySite, imageBlocks] =
      await Promise.all([
        db.site.count({ where: { userId } }),
        db.page.groupBy({
          by: ["status"],
          where: { site: { userId }, deletedAt: null },
          _count: true,
        }),
        db.formSubmission.count({
          where: {
            page: { site: { userId } },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        db.formSubmission.count({
          where: {
            page: { site: { userId } },
            isRead: false,
          },
        }),
        db.media.count({ where: { userId } }),
        db.pageView.count({
          where: {
            site: { userId },
            viewedAt: { gte: thirtyDaysAgo30 },
          },
        }),
        db.page.findMany({
          where: { site: { userId }, deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
            site: { select: { name: true, id: true } },
          },
        }),
        db.formSubmission.findMany({
          where: { page: { site: { userId } } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            isRead: true,
            readAt: true,
            createdAt: true,
            page: { select: { title: true, siteId: true } },
          },
        }),
        db.site.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        }),
        db.site.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            updatedAt: true,
            pages: {
              where: { deletedAt: null },
              select: { status: true, formSubmissions: { select: { id: true } } },
            },
          },
        }),
        // Content health queries — grouped by site for deep-links
        db.page.groupBy({
          by: ["siteId"],
          where: { status: "PUBLISHED", deletedAt: null, site: { userId }, updatedAt: { lt: ninetyDaysAgo } },
          _count: true,
        }),
        db.page.groupBy({
          by: ["siteId"],
          where: { status: "PUBLISHED", deletedAt: null, site: { userId }, description: null },
          _count: true,
        }),
        db.page.groupBy({
          by: ["siteId"],
          where: { status: "DRAFT", deletedAt: null, site: { userId }, publishedAt: null },
          _count: true,
        }),
        db.block.findMany({
          where: { type: "image", page: { status: "PUBLISHED", deletedAt: null, site: { userId } } },
          select: { content: true, page: { select: { siteId: true } } },
        }),
      ]);

    const pageCount = pageCounts.reduce((sum, g) => sum + g._count, 0);
    const publishedCount = pageCounts.find((g) => g.status === "PUBLISHED")?._count ?? 0;

    const siteOverviews: SiteOverview[] = sites.map((site) => ({
      id: site.id,
      name: site.name,
      slug: site.slug,
      updatedAt: site.updatedAt,
      pageCount: site.pages.length,
      publishedCount: site.pages.filter((p) => p.status === "PUBLISHED").length,
      submissionCount: site.pages.reduce((sum, p) => sum + p.formSubmissions.length, 0),
    }));

    // Build site name lookup for health deep-links
    const siteNameMap = new Map(sites.map((s) => [s.id, s.name]));

    const stalePages = staleBySite.reduce((sum, g) => sum + g._count, 0);
    const missingDescriptions = missingDescBySite.reduce((sum, g) => sum + g._count, 0);
    const draftCount = draftBySite.reduce((sum, g) => sum + g._count, 0);

    // Build per-site health breakdown for deep-links
    const stalePerSite = staleBySite
      .filter((g) => g._count > 0)
      .map((g) => ({ siteId: g.siteId, siteName: siteNameMap.get(g.siteId) ?? "Unknown", count: g._count }));
    const missingDescPerSite = missingDescBySite
      .filter((g) => g._count > 0)
      .map((g) => ({ siteId: g.siteId, siteName: siteNameMap.get(g.siteId) ?? "Unknown", count: g._count }));
    const draftPerSite = draftBySite
      .filter((g) => g._count > 0)
      .map((g) => ({ siteId: g.siteId, siteName: siteNameMap.get(g.siteId) ?? "Unknown", count: g._count }));

    // Compute missing alt per site
    const altBySiteMap = new Map<string, number>();
    for (const b of imageBlocks) {
      const content = b.content as Record<string, unknown>;
      if (!content.alt || (typeof content.alt === "string" && content.alt.trim() === "")) {
        const sid = b.page.siteId;
        altBySiteMap.set(sid, (altBySiteMap.get(sid) ?? 0) + 1);
      }
    }
    const missingAltText = Array.from(altBySiteMap.values()).reduce((sum, c) => sum + c, 0);
    const missingAltPerSite = Array.from(altBySiteMap.entries())
      .filter(([_, count]) => count > 0)
      .map(([siteId, count]) => ({ siteId, siteName: siteNameMap.get(siteId) ?? "Unknown", count }));

    return { siteCount, pageCount, publishedCount, submissionCount, unreadSubmissionCount, mediaCount, totalPageViews, recentPages, recentSubmissions, firstSite, siteOverviews, stalePages, missingDescriptions, missingAltText, draftCount, stalePerSite, missingDescPerSite, draftPerSite, missingAltPerSite };
  },
  ["dashboard"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function DashboardPage() {
  const user = await requireAuth();

  const { siteCount, pageCount, publishedCount, submissionCount, unreadSubmissionCount, mediaCount, totalPageViews, recentPages, recentSubmissions, firstSite, siteOverviews, stalePages, missingDescriptions, missingAltText, draftCount, stalePerSite, missingDescPerSite, draftPerSite, missingAltPerSite } =
    await getDashboardData(user.id);

  return (
    <>
      <Topbar title={`Welcome back${user.name ? `, ${user.name}` : ""}`} />
      <div className={styles.content}>
        <GettingStarted
          siteCount={siteCount}
          pageCount={pageCount}
          publishedCount={publishedCount}
          firstSiteId={firstSite?.id}
        />
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconAccent}`}><Globe size={20} /></div>
            <div className={styles.statValue}>{siteCount}</div>
            <div className={styles.statLabel}>Sites</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}><FileText size={20} /></div>
            <div className={styles.statValue}>{pageCount}</div>
            <div className={styles.statLabel}>Pages</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}><CheckCircle size={20} /></div>
            <div className={styles.statValue}>{publishedCount}</div>
            <div className={styles.statLabel}>Published</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconOrange}`}><Send size={20} /></div>
            <div className={styles.statValue}>{submissionCount}</div>
            <div className={styles.statLabel}>Submissions (30d)</div>
          </div>
          {unreadSubmissionCount > 0 && (
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statIconRed}`}><Mail size={20} /></div>
              <div className={styles.statValue}>{unreadSubmissionCount}</div>
              <div className={styles.statLabel}>Unread</div>
            </div>
          )}
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}><ImageIcon size={20} /></div>
            <div className={styles.statValue}>{mediaCount}</div>
            <div className={styles.statLabel}>Media Files</div>
          </div>
          {totalPageViews > 0 && (
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statIconBlue}`}><Eye size={20} /></div>
              <div className={styles.statValue}>{totalPageViews.toLocaleString()}</div>
              <div className={styles.statLabel}>Page Views (30d)</div>
            </div>
          )}
        </div>

        <div className={styles.quickActions}>
          <Link href="/sites/new" className={styles.quickAction}>
            <Plus size={16} />
            New Site
          </Link>
          <Link href="/media" className={styles.quickAction}>
            <Upload size={16} />
            Upload Media
          </Link>
          <Link href="/templates" className={styles.quickAction}>
            <LayoutTemplate size={16} />
            Browse Templates
          </Link>
        </div>

        <ContentHealth
          stalePages={stalePages}
          missingDescriptions={missingDescriptions}
          missingAltText={missingAltText}
          draftCount={draftCount}
          stalePerSite={stalePerSite}
          missingDescPerSite={missingDescPerSite}
          draftPerSite={draftPerSite}
          missingAltPerSite={missingAltPerSite}
        />

        {siteOverviews.length > 1 && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Sites Overview</h3>
            <div className={styles.siteOverviewGrid}>
              {siteOverviews.map((site) => (
                <Link key={site.id} href={`/sites/${site.id}`} className={styles.siteOverviewCard}>
                  <div className={styles.siteOverviewName}>{site.name}</div>
                  <div className={styles.siteOverviewStats}>
                    <span>{site.pageCount} pages</span>
                    <span>{site.publishedCount} published</span>
                    {site.submissionCount > 0 && <span>{site.submissionCount} submissions</span>}
                  </div>
                  <div className={styles.siteOverviewDate}>Updated {formatDate(site.updatedAt)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Recent Pages</h3>
            {recentPages.length === 0 ? (
              <div className={styles.emptyCard}>
                <div className={styles.emptyCardIcon}><FileEdit size={24} /></div>
                <p className={styles.emptyText}>No pages yet</p>
                <Link href="/sites" className={styles.emptyCardLink}>Create your first page</Link>
              </div>
            ) : (
              <ul className={styles.list}>
                {recentPages.map((page) => (
                  <li key={page.id} className={styles.listItem}>
                    <Link href={`/editor/${page.id}`} className={styles.listLink}>
                      <div>
                        <span className={styles.listTitle}>{page.title}</span>
                        <span className={styles.listMeta}>{page.site.name}</span>
                      </div>
                      <div className={styles.listRight}>
                        <span className={`${styles.statusDot} ${page.status === "PUBLISHED" ? styles.statusPublished : ""}`} />
                        <span className={styles.statusLabel}>{page.status === "PUBLISHED" ? "Published" : "Draft"}</span>
                        <span className={styles.listDate}>{formatDate(page.updatedAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Recent Submissions</h3>
            {recentSubmissions.length === 0 ? (
              <div className={styles.emptyCard}>
                <div className={styles.emptyCardIcon}><Inbox size={24} /></div>
                <p className={styles.emptyText}>No form submissions yet</p>
                <p className={styles.emptyHint}>Add a form block to your pages to collect submissions</p>
              </div>
            ) : (
              <>
                <ul className={styles.list}>
                  {recentSubmissions.map((sub) => (
                    <li key={sub.id} className={styles.listItem}>
                      <Link href={`/sites/${sub.page.siteId}/submissions`} className={styles.listLink}>
                        <div className={styles.listRight}>
                          {!sub.isRead && <span className={styles.unreadDot} title="Unread" />}
                          <span className={`${styles.listTitle} ${!sub.isRead ? styles.listTitleBold : ""}`}>{sub.page.title}</span>
                        </div>
                        <span className={styles.listDate}>{formatDate(sub.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className={styles.cardFooter}>
                  <Link href={`/sites/${recentSubmissions[0].page.siteId}/submissions`} className={styles.viewAllLink}>
                    View all submissions
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <ActivityFeed />
      </div>
    </>
  );
}
