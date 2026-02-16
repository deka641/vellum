import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Topbar } from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/Button/Button";
import { formatDate } from "@/lib/utils";
import styles from "./submissions.module.css";

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function SubmissionsPage({ params }: Props) {
  const user = await requireAuth();
  const { siteId } = await params;

  const site = await db.site.findFirst({
    where: { id: siteId, userId: user.id },
    select: { id: true, name: true },
  });

  if (!site) notFound();

  const submissions = await db.formSubmission.findMany({
    where: { page: { siteId } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      blockId: true,
      data: true,
      createdAt: true,
      page: { select: { title: true } },
    },
  });

  return (
    <>
      <Topbar
        title={`Submissions - ${site.name}`}
        actions={
          <Link href={`/sites/${siteId}`}>
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} size="sm">
              Back
            </Button>
          </Link>
        }
      />
      <div className={styles.content}>
        {submissions.length === 0 ? (
          <div className={styles.empty}>
            <p>No form submissions yet</p>
            <span>Form submissions from your published pages will appear here.</span>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Page</th>
                  <th className={styles.th}>Data</th>
                  <th className={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const data = sub.data as Record<string, string>;
                  return (
                    <tr key={sub.id} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.pageName}>{sub.page.title}</span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.dataFields}>
                          {Object.entries(data).map(([key, value]) => (
                            <div key={key} className={styles.dataField}>
                              <span className={styles.dataKey}>{key}:</span>
                              <span className={styles.dataValue}>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.date}>{formatDate(sub.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
