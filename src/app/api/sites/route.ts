import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
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
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let slug = slugify(name);

  const existing = await db.site.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const site = await db.site.create({
    data: {
      name,
      slug,
      description: description || null,
      userId: session.user.id,
    },
  });

  // Create a default homepage
  await db.page.create({
    data: {
      title: "Home",
      slug: "home",
      isHomepage: true,
      siteId: site.id,
    },
  });

  return NextResponse.json(site, { status: 201 });
}
