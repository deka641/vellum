import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, createApiKeySchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { generateApiKey } from "@/lib/api-key";
import { logger } from "@/lib/logger";

const MAX_KEYS_PER_SITE = 5;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;

    const rl = rateLimit(`api-keys-read:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const apiKeys = await db.apiKey.findMany({
      where: { siteId },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/api-keys", error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`api-keys:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(createApiKeySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Enforce max keys per site
    const existingCount = await db.apiKey.count({ where: { siteId } });
    if (existingCount >= MAX_KEYS_PER_SITE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_KEYS_PER_SITE} API keys per site` },
        { status: 400 }
      );
    }

    const { key, hash, prefix } = generateApiKey();

    const apiKey = await db.apiKey.create({
      data: {
        siteId,
        name: parsed.data.name,
        keyHash: hash,
        prefix,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
      },
    });

    logger.info("api-keys", `API key created for site ${siteId}: ${prefix}...`);
    revalidateTag("dashboard", { expire: 0 });

    // Return the full key ONCE — it is never stored or retrievable again
    return NextResponse.json({ ...apiKey, key }, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites/[siteId]/api-keys", error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`api-keys:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "API key ID required" }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.apiKey.deleteMany({
      where: { id: keyId, siteId },
    });

    logger.info("api-keys", `API key ${keyId} deleted from site ${siteId}`);
    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/sites/[siteId]/api-keys", error);
  }
}
