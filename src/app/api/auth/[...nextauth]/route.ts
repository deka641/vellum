import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const { GET } = handlers;

export async function POST(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/callback/credentials")) {
    const ip = getClientIp(req);
    const rl = rateLimit(`auth:${ip}`, "auth");
    if (!rl.success) return rateLimitResponse(rl);
  }
  return handlers.POST(req);
}
