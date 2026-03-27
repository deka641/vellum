import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

const MAX_BACKUPS_PER_SITE = 5;

export async function POST(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("cron", "CRON_SECRET environment variable is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const expected = `Bearer ${cronSecret}`;
    const provided = authHeader || "";
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all sites with autoBackup enabled
    const sites = await db.site.findMany({
      where: { autoBackup: true },
      include: {
        pages: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            blocks: { orderBy: { sortOrder: "asc" } },
            pageTags: { include: { tag: { select: { slug: true } } } },
          },
        },
        tags: { select: { name: true, slug: true } },
        redirects: { select: { fromPath: true, toPath: true, permanent: true } },
      },
    });

    if (sites.length === 0) {
      logger.info("cron", "No sites with auto-backup enabled");
      return NextResponse.json({ backedUp: 0 });
    }

    let successCount = 0;
    const errors: Array<{ siteId: string; siteName: string; error: string }> = [];

    for (const site of sites) {
      try {
        // Generate export data (v2 format, matches /api/sites/[siteId]/export)
        const exportData = {
          version: 2,
          exportedAt: new Date().toISOString(),
          site: {
            name: site.name,
            description: site.description,
            theme: site.theme,
            logo: site.logo,
            footer: site.footer,
            customHead: site.customHead,
            customFooter: site.customFooter,
            notificationEmail: site.notificationEmail,
            favicon: site.favicon,
            defaultOgImage: site.defaultOgImage,
            cookieConsent: site.cookieConsent,
            autoBackup: site.autoBackup,
            turnstileSiteKey: site.turnstileSiteKey,
          },
          tags: site.tags.map((tag) => ({
            name: tag.name,
            slug: tag.slug,
          })),
          redirects: site.redirects.map((r) => ({
            fromPath: r.fromPath,
            toPath: r.toPath,
            permanent: r.permanent,
          })),
          pages: site.pages.map((page) => ({
            title: page.title,
            slug: page.slug,
            description: page.description,
            status: page.status,
            isHomepage: page.isHomepage,
            showInNav: page.showInNav,
            sortOrder: page.sortOrder,
            metaTitle: page.metaTitle,
            ogImage: page.ogImage,
            noindex: page.noindex,
            tags: page.pageTags.map((pt) => pt.tag.slug),
            blocks: page.blocks.map((block) => ({
              id: block.id,
              type: block.type,
              content: block.content,
              settings: block.settings,
              sortOrder: block.sortOrder,
              parentId: block.parentId,
            })),
          })),
        };

        // Save to public/backups/{siteId}/{timestamp}.json
        const backupDir = join(process.cwd(), "public", "backups", site.id);
        await mkdir(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${timestamp}.json`;
        const filePath = join(backupDir, filename);

        await writeFile(filePath, JSON.stringify(exportData, null, 2), "utf-8");

        // Keep max 5 backups per site, deleting oldest
        const files = await readdir(backupDir);
        const jsonFiles = files
          .filter((f) => f.endsWith(".json"))
          .sort();

        if (jsonFiles.length > MAX_BACKUPS_PER_SITE) {
          const toDelete = jsonFiles.slice(0, jsonFiles.length - MAX_BACKUPS_PER_SITE);
          for (const file of toDelete) {
            try {
              await unlink(join(backupDir, file));
              logger.info("cron", `Deleted old backup for site ${site.id}: ${file}`);
            } catch (err) {
              logger.warn("cron", `Failed to delete old backup ${file}:`, err);
            }
          }
        }

        successCount++;
        logger.info("cron", `Backup created for site ${site.id} (${site.name}): ${filename}`);
      } catch (err) {
        logger.error("cron", `Failed to backup site ${site.id} (${site.name}):`, err);
        errors.push({
          siteId: site.id,
          siteName: site.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    logger.info("cron", `Auto-backup complete: ${successCount}/${sites.length} sites backed up`);

    const status = errors.length > 0 ? 207 : 200;
    return NextResponse.json({ backedUp: successCount, total: sites.length, errors }, { status });
  } catch (error) {
    return apiError("POST /api/cron/backup", error);
  }
}
