import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { parseBody, registerSchema } from "@/lib/validations";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`register:${ip}`, "auth");
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

    const parsed = parseBody(registerSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiError("POST /api/register", error);
  }
}
