import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Globe, FileText, Send, Image as ImageIcon, Plus, Upload, LayoutTemplate, FileEdit, Inbox, CheckCircle, Mail } from "lucide-react";
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
    const [siteCount, pageCounts, submissionCount, unreadSubmissionCount, mediaCount, recentPages, recentSubmissions, firstSite, sites, stalePages, missingDescriptions, draftCount, imageBlocks] =
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
            readAt: null,
          },
        }),
        db.media.count({ where: { userId } }),
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
        // Content health queries
        db.page.count({
          where: { status: "PUBLISHED", deletedAt: null, site: { userId }, updatedAt: { lt: ninetyDaysAgo } },
        }),
        db.page.count({
          where: { status: "PUBLISHED", deletedAt: null, site: { userId }, description: null },
        }),
        db.page.count({
          where: { status: "DRAFT", deletedAt: null, site: { userId }, publishedAt: null },
        }),
        db.block.findMany({
          where: { type: "image", page: { status: "PUBLISHED", deletedAt: null, site: { userId } } },
          select: { content: true },
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

    const missingAltText = imageBlocks.filter((b) => {
      const content = b.content as Record<string, unknown>;
      return !content.alt || (typeof content.alt === "string" && content.alt.trim() === "");
    }).length;

    return { siteCount, pageCount, publishedCount, submissionCount, unreadSubmissionCount, mediaCount, recentPages, recentSubmissions, firstSite, siteOverviews, stalePages, missingDescriptions, missingAltText, draftCount };
  },
  ["dashboard"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function DashboardPage() {
  const user = await requireAuth();

  const { siteCount, pageCount, publishedCount, submissionCount, unreadSubmissionCount, mediaCount, recentPages, recentSubmissions, firstSite, siteOverviews, stalePages, missingDescriptions, missingAltText, draftCount } =
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
                          {!sub.readAt && <span className={styles.unreadDot} title="Unread" />}
                          <span className={`${styles.listTitle} ${!sub.readAt ? styles.listTitleBold : ""}`}>{sub.page.title}</span>
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
