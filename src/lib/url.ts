import { headers } from "next/headers";

/**
 * Derive the site's base URL from request headers.
 * Falls back to NEXT_PUBLIC_SITE_URL env var, then localhost.
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    }
  } catch {
    // headers() throws during static generation — fall through
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Build the canonical URL path for a published page.
 */
export function buildPageUrl(
  baseUrl: string,
  siteSlug: string,
  isHomepage: boolean,
  pageSlug?: string
): string {
  if (isHomepage) {
    return `${baseUrl}/s/${siteSlug}`;
  }
  return `${baseUrl}/s/${siteSlug}/${pageSlug}`;
}
