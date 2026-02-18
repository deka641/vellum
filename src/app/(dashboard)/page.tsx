import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Globe, FileText, Send, Image as ImageIcon, Plus, Upload, LayoutTemplate, FileEdit, Inbox } from "lucide-react";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Topbar } from "@/components/dashboard/Topbar";
import { GettingStarted } from "@/components/dashboard/GettingStarted";
import { formatDate } from "@/lib/utils";
import styles from "./home.module.css";

const getDashboardData = unstable_cache(
  async (userId: string) => {
    const [siteCount, pageCounts, submissionCount, mediaCount, recentPages, recentSubmissions, firstSite] =
      await Promise.all([
        db.site.count({ where: { userId } }),
        db.page.groupBy({
          by: ["status"],
          where: { site: { userId } },
          _count: true,
        }),
        db.formSubmission.count({
          where: {
            page: { site: { userId } },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        db.media.count({ where: { userId } }),
        db.page.findMany({
          where: { site: { userId } },
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
            createdAt: true,
            page: { select: { title: true } },
          },
        }),
        db.site.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        }),
      ]);

    const pageCount = pageCounts.reduce((sum, g) => sum + g._count, 0);
    const publishedCount = pageCounts.find((g) => g.status === "PUBLISHED")?._count ?? 0;

    return { siteCount, pageCount, publishedCount, submissionCount, mediaCount, recentPages, recentSubmissions, firstSite };
  },
  ["dashboard"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function DashboardPage() {
  const user = await requireAuth();

  const { siteCount, pageCount, publishedCount, submissionCount, mediaCount, recentPages, recentSubmissions, firstSite } =
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
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}><FileText size={20} /></div>
            <div className={styles.statValue}>{publishedCount}</div>
            <div className={styles.statLabel}>Published</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconOrange}`}><Send size={20} /></div>
            <div className={styles.statValue}>{submissionCount}</div>
            <div className={styles.statLabel}>Submissions (30d)</div>
          </div>
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
              <ul className={styles.list}>
                {recentSubmissions.map((sub) => (
                  <li key={sub.id} className={styles.listItem}>
                    <div className={styles.listLink}>
                      <span className={styles.listTitle}>{sub.page.title}</span>
                      <span className={styles.listDate}>{formatDate(sub.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
