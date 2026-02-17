import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { parseBody, updateProfileSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return apiError("GET /api/user/profile", error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`profile:${userId}`, "mutation");
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

    const parsed = parseBody(updateProfileSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Check email uniqueness if changing (case-insensitive)
    const normalizedEmail = parsed.data.email?.toLowerCase();
    if (normalizedEmail) {
      const existing = await db.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing && existing.id !== userId) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 409 }
        );
      }
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.name,
        email: normalizedEmail ?? parsed.data.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/user/profile", error);
  }
}
