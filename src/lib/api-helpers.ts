import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Generate a short unique error ID for correlating client errors with server logs.
 */
function generateErrorId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Log and return a structured 500 error response with a traceable errorId.
 */
export function apiError(route: string, error: unknown): NextResponse {
  const errorId = generateErrorId();
  const message = error instanceof Error ? error.message : String(error);
  logger.error("api", `[${errorId}] ${route} failed: ${message}`, error);
  return NextResponse.json(
    { error: "Internal server error", errorId },
    { status: 500 }
  );
}
