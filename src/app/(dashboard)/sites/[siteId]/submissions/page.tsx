import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Topbar } from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/Button/Button";
import { SubmissionsClient } from "./SubmissionsClient";

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function SubmissionsPage({ params }: Props) {
  const user = await requireAuth();
  const { siteId } = await params;

  const site = await db.site.findFirst({
    where: { id: siteId, userId: user.id },
    select: {
      id: true,
      name: true,
      pages: {
        select: { id: true, title: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!site) notFound();

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
      <SubmissionsClient siteId={siteId} pages={site.pages} />
    </>
  );
}
