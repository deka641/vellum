import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { parseBody, resetPasswordSchema } from "@/lib/validations";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`reset-pw:${ip}`, "auth");
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

    const parsed = parseBody(resetPasswordSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await db.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link has expired" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);

    // Atomic update-if-unused to prevent TOCTOU race condition
    await db.$transaction(async (tx) => {
      const updated = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new Error("Token already used");
      }
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
    });

    return NextResponse.json({ message: "Password has been reset successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Token already used") {
      return NextResponse.json(
        { error: "This reset link has already been used" },
        { status: 400 }
      );
    }
    return apiError("POST /api/auth/reset-password", error);
  }
}
