import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { slugify } from "@/lib/utils";
import { parseBody, createSiteSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { makeStarterBlocks, STARTER_PAGE_CONFIG } from "@/lib/starter-templates";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sites = await db.site.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { pages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(sites);
  } catch (error) {
    return apiError("GET /api/sites", error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sites-post:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(createSiteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, description, theme, starterPages } = parsed.data;

    const userId = session.user.id;

    const MAX_SLUG_RETRIES = 3;
    let site;
    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
      try {
        site = await db.$transaction(async (tx) => {
          let slug = slugify(name);
          const existing = await tx.site.findUnique({ where: { slug } });
          if (existing || attempt > 0) {
            slug = `${slug}-${Date.now().toString(36)}`;
          }

          const s = await tx.site.create({
            data: {
              name,
              slug,
              description: description || null,
              userId,
              ...(theme ? { theme: theme as unknown as Prisma.InputJsonValue } : {}),
            },
          });

          // Determine which pages to create
          const pagesToCreate = starterPages && starterPages.length > 0
            ? starterPages
            : ["homepage" as const]; // Always at least homepage

          // Ensure homepage is included
          const hasHomepage = pagesToCreate.includes("homepage");

          for (const pageKey of pagesToCreate) {
            const config = STARTER_PAGE_CONFIG[pageKey];
            if (!config) continue;

            const blocks = makeStarterBlocks(pageKey, name);

            const page = await tx.page.create({
              data: {
                title: config.title,
                slug: config.slug,
                isHomepage: config.isHomepage,
                showInNav: config.showInNav,
                sortOrder: config.sortOrder,
                siteId: s.id,
              },
            });

            if (blocks.length > 0) {
              await tx.block.createMany({
                data: blocks.map((b, i) => ({
                  id: b.id,
                  type: b.type,
                  content: b.content as unknown as Prisma.InputJsonValue,
                  settings: b.settings as unknown as Prisma.InputJsonValue,
                  pageId: page.id,
                  sortOrder: i,
                })),
              });
            }
          }

          // If no homepage was in the selection, create a minimal one
          if (!hasHomepage) {
            await tx.page.create({
              data: {
                title: "Home",
                slug: "home",
                isHomepage: true,
                siteId: s.id,
                sortOrder: -1,
              },
            });
          }

          return s;
        });
        break; // Success — exit retry loop
      } catch (error) {
        const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (isUniqueViolation && attempt < MAX_SLUG_RETRIES - 1) {
          continue; // Retry with different slug
        }
        throw error; // Rethrow if not a unique constraint error or out of retries
      }
    }

    revalidateTag("dashboard", { expire: 0 });
    logActivity({ userId, siteId: site!.id, action: "site.created", details: { name: site!.name } });
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites", error);
  }
}
