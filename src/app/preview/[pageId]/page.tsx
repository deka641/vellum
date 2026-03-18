import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { parseSiteTheme, generateThemeVariables, FONT_PRESETS } from "@/lib/theme";
import { PublishedPage } from "@/components/published/PublishedPage";
import type { BlockType, BlockData } from "@/types/blocks";

interface Props {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PreviewPage({ params, searchParams }: Props) {
  const { pageId } = await params;
  const { token } = await searchParams;

  let page;

  if (token) {
    // Token-based preview: no auth required, validate token
    page = await db.page.findFirst({
      where: { id: pageId, deletedAt: null, previewToken: token },
      include: {
        blocks: { orderBy: { sortOrder: "asc" } },
        site: { select: { theme: true } },
      },
    });
  } else {
    // Authenticated preview: require login
    const user = await getCurrentUser();
    if (!user) notFound();
    page = await db.page.findFirst({
      where: { id: pageId, deletedAt: null, site: { userId: user.id } },
      include: {
        blocks: { orderBy: { sortOrder: "asc" } },
        site: { select: { theme: true } },
      },
    });
  }

  if (!page) notFound();

  const blocks: BlockData[] = page.blocks.map((b) => ({
    id: b.id,
    type: b.type as BlockType,
    content: b.content as Record<string, unknown>,
    settings: (b.settings || {}) as Record<string, unknown>,
    parentId: b.parentId,
  }));

  const theme = parseSiteTheme(page.site.theme);
  const themeVars = theme ? generateThemeVariables(theme) : {};
  const fontPreset = theme ? FONT_PRESETS[theme.fontPreset] : null;

  return (
    <div style={themeVars as React.CSSProperties}>
      {fontPreset?.googleFontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontPreset.googleFontsUrl} />
        </>
      )}
      <PublishedPage title={page.title} blocks={blocks} />
    </div>
  );
}
