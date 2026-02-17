import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { slugify } from "@/lib/utils";
import { parseBody, createSiteSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

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
    const { name, description } = parsed.data;

    const userId = session.user.id;

    let slug = slugify(name);

    const existing = await db.site.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const site = await db.$transaction(async (tx) => {
      const s = await tx.site.create({
        data: {
          name,
          slug,
          description: description || null,
          userId,
        },
      });

      await tx.page.create({
        data: {
          title: "Home",
          slug: "home",
          isHomepage: true,
          siteId: s.id,
        },
      });

      return s;
    });

    revalidateTag("dashboard", { expire: 0 });
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites", error);
  }
}
