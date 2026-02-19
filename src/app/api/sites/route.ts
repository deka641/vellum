import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { slugify, generateId } from "@/lib/utils";
import { parseBody, createSiteSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";

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

function makeStarterBlocks(pageKey: string, siteName: string) {
  switch (pageKey) {
    case "homepage":
      return [
        { id: generateId(), type: "heading", content: { text: `Welcome to ${siteName}`, level: 1 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>This is your homepage. Edit this content in the editor to tell visitors what your site is about.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "What We Offer", level: 2 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>Describe your products, services, or content here. Use the editor to add images, columns, and more blocks to build out this section.</p>" }, settings: {} },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "button", content: { text: "Get Started", url: "#", variant: "primary" }, settings: { align: "center" } },
      ];
    case "about":
      return [
        { id: generateId(), type: "heading", content: { text: "About Us", level: 1 }, settings: {} },
        { id: generateId(), type: "text", content: { html: "<p>Share your story here. Tell visitors who you are, what you do, and why you do it.</p>" }, settings: {} },
        { id: generateId(), type: "spacer", content: { height: 24 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Our Mission", level: 2 }, settings: {} },
        { id: generateId(), type: "text", content: { html: "<p>Describe your mission, values, or goals. What drives your work?</p>" }, settings: {} },
        { id: generateId(), type: "spacer", content: { height: 24 }, settings: {} },
        { id: generateId(), type: "quote", content: { text: "Add an inspiring quote or testimonial here.", attribution: "Your Name", style: "bordered" }, settings: {} },
      ];
    case "contact":
      return [
        { id: generateId(), type: "heading", content: { text: "Contact Us", level: 1 }, settings: {} },
        { id: generateId(), type: "text", content: { html: "<p>We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.</p>" }, settings: {} },
        { id: generateId(), type: "spacer", content: { height: 16 }, settings: {} },
        {
          id: generateId(), type: "form", content: {
            fields: [
              { id: "name", type: "text", label: "Name", required: true, placeholder: "Your name" },
              { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
              { id: "message", type: "textarea", label: "Message", required: false, placeholder: "How can we help?" },
            ],
            submitText: "Send Message",
            successMessage: "Thank you! We'll get back to you soon.",
          }, settings: {}
        },
      ];
    default:
      return [];
  }
}

const STARTER_PAGE_CONFIG: Record<string, { title: string; slug: string; isHomepage: boolean; showInNav: boolean; sortOrder: number }> = {
  homepage: { title: "Home", slug: "home", isHomepage: true, showInNav: true, sortOrder: 0 },
  about: { title: "About", slug: "about", isHomepage: false, showInNav: true, sortOrder: 1 },
  contact: { title: "Contact", slug: "contact", isHomepage: false, showInNav: true, sortOrder: 2 },
};

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
          ...(theme ? { theme: theme as unknown as Prisma.InputJsonValue } : {}),
        },
      });

      // Determine which pages to create
      const pagesToCreate = starterPages && starterPages.length > 0
        ? starterPages
        : ["homepage"]; // Always at least homepage

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

    revalidateTag("dashboard", { expire: 0 });
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites", error);
  }
}
