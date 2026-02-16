import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { PublishedPage } from "@/components/published/PublishedPage";

interface Props {
  params: Promise<{ pageId: string }>;
}

export default async function PreviewPage({ params }: Props) {
  const user = await requireAuth();
  const { pageId } = await params;

  const page = await db.page.findFirst({
    where: { id: pageId, site: { userId: user.id } },
    include: { blocks: { orderBy: { sortOrder: "asc" } } },
  });

  if (!page) notFound();

  const blocks = page.blocks.map((b) => ({
    id: b.id,
    type: b.type,
    content: b.content as Record<string, unknown>,
    settings: (b.settings || {}) as Record<string, unknown>,
    parentId: b.parentId,
  }));

  return <PublishedPage title={page.title} blocks={blocks} />;
}
