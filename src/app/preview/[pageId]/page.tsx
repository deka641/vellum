import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PublishedPage } from "@/components/published/PublishedPage";

interface Props {
  params: Promise<{ pageId: string }>;
}

export default async function PreviewPage({ params }: Props) {
  const { pageId } = await params;

  const page = await db.page.findUnique({
    where: { id: pageId },
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
