import Link from "next/link";
import { Globe, FileText, Send, Image, Plus, Upload } from "lucide-react";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Topbar } from "@/components/dashboard/Topbar";
import { formatDate } from "@/lib/utils";
import styles from "./home.module.css";

export default async function DashboardPage() {
  const user = await requireAuth();

  const [siteCount, pageCount, publishedCount, submissionCount, mediaCount, recentPages, recentSubmissions] =
    await Promise.all([
      db.site.count({ where: { userId: user.id } }),
      db.page.count({ where: { site: { userId: user.id } } }),
      db.page.count({ where: { site: { userId: user.id }, status: "PUBLISHED" } }),
      db.formSubmission.count({
        where: {
          page: { site: { userId: user.id } },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.media.count({ where: { userId: user.id } }),
      db.page.findMany({
        where: { site: { userId: user.id } },
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
        where: { page: { site: { userId: user.id } } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          page: { select: { title: true } },
        },
      }),
    ]);

  return (
    <>
      <Topbar title={`Welcome back${user.name ? `, ${user.name}` : ""}`} />
      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><Globe size={20} /></div>
            <div className={styles.statValue}>{siteCount}</div>
            <div className={styles.statLabel}>Sites</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><FileText size={20} /></div>
            <div className={styles.statValue}>{pageCount}</div>
            <div className={styles.statLabel}>Pages</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}><FileText size={20} /></div>
            <div className={styles.statValue}>{publishedCount}</div>
            <div className={styles.statLabel}>Published</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><Send size={20} /></div>
            <div className={styles.statValue}>{submissionCount}</div>
            <div className={styles.statLabel}>Submissions (30d)</div>
          </div>
        </div>

        <div className={styles.quickActions}>
          <Link href="/sites" className={styles.quickAction}>
            <Plus size={16} />
            New Site
          </Link>
          <Link href="/media" className={styles.quickAction}>
            <Upload size={16} />
            Upload Media
          </Link>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Recent Pages</h3>
            {recentPages.length === 0 ? (
              <p className={styles.emptyText}>No pages yet</p>
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
              <p className={styles.emptyText}>No form submissions yet</p>
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
