import { describe, it, expect } from "vitest";

/**
 * Tests for middleware routing logic.
 * Since the actual middleware uses NextAuth's auth() wrapper which requires
 * the full Next.js runtime, we test the routing decision logic in isolation.
 */

// Extract the routing logic from middleware for testability
function getMiddlewareAction(pathname: string, isLoggedIn: boolean): "redirect-to-sites" | "redirect-to-login" | "next" {
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/sites") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/settings");

  if (isAuthRoute && isLoggedIn) {
    return "redirect-to-sites";
  }

  if (isProtectedRoute && !isLoggedIn) {
    return "redirect-to-login";
  }

  return "next";
}

// Test the matcher pattern: /((?!api|_next/static|_next/image|favicon.ico|uploads|s/).*)
function matchesMiddleware(pathname: string): boolean {
  const pattern = /^\/((?!api|_next\/static|_next\/image|favicon\.ico|uploads|s\/).*)$/;
  return pattern.test(pathname);
}

describe("middleware routing logic", () => {
  describe("auth route redirects (logged in)", () => {
    it("redirects /login to /sites when logged in", () => {
      expect(getMiddlewareAction("/login", true)).toBe("redirect-to-sites");
    });

    it("redirects /register to /sites when logged in", () => {
      expect(getMiddlewareAction("/register", true)).toBe("redirect-to-sites");
    });

    it("redirects /forgot-password to /sites when logged in", () => {
      expect(getMiddlewareAction("/forgot-password", true)).toBe("redirect-to-sites");
    });

    it("redirects /reset-password to /sites when logged in", () => {
      expect(getMiddlewareAction("/reset-password", true)).toBe("redirect-to-sites");
    });
  });

  describe("protected route redirects (logged out)", () => {
    it("redirects / to /login when logged out", () => {
      expect(getMiddlewareAction("/", false)).toBe("redirect-to-login");
    });

    it("redirects /sites to /login when logged out", () => {
      expect(getMiddlewareAction("/sites", false)).toBe("redirect-to-login");
    });

    it("redirects /sites/abc to /login when logged out", () => {
      expect(getMiddlewareAction("/sites/abc", false)).toBe("redirect-to-login");
    });

    it("redirects /editor/abc to /login when logged out", () => {
      expect(getMiddlewareAction("/editor/abc", false)).toBe("redirect-to-login");
    });

    it("redirects /media to /login when logged out", () => {
      expect(getMiddlewareAction("/media", false)).toBe("redirect-to-login");
    });

    it("redirects /templates to /login when logged out", () => {
      expect(getMiddlewareAction("/templates", false)).toBe("redirect-to-login");
    });

    it("redirects /settings to /login when logged out", () => {
      expect(getMiddlewareAction("/settings", false)).toBe("redirect-to-login");
    });
  });

  describe("passthrough routes", () => {
    it("allows auth routes when logged out", () => {
      expect(getMiddlewareAction("/login", false)).toBe("next");
    });

    it("allows protected routes when logged in", () => {
      expect(getMiddlewareAction("/sites", true)).toBe("next");
    });

    it("allows / when logged in", () => {
      expect(getMiddlewareAction("/", true)).toBe("next");
    });

    it("allows /editor when logged in", () => {
      expect(getMiddlewareAction("/editor/page123", true)).toBe("next");
    });

    it("allows unknown routes regardless of auth", () => {
      expect(getMiddlewareAction("/privacy", false)).toBe("next");
      expect(getMiddlewareAction("/privacy", true)).toBe("next");
      expect(getMiddlewareAction("/terms", false)).toBe("next");
    });
  });
});

describe("middleware matcher pattern", () => {
  it("matches root path", () => {
    expect(matchesMiddleware("/")).toBe(true);
  });

  it("matches dashboard routes", () => {
    expect(matchesMiddleware("/sites")).toBe(true);
    expect(matchesMiddleware("/editor/abc")).toBe(true);
    expect(matchesMiddleware("/media")).toBe(true);
    expect(matchesMiddleware("/settings")).toBe(true);
  });

  it("matches auth routes", () => {
    expect(matchesMiddleware("/login")).toBe(true);
    expect(matchesMiddleware("/register")).toBe(true);
  });

  it("excludes API routes", () => {
    expect(matchesMiddleware("/api/pages")).toBe(false);
    expect(matchesMiddleware("/api/sites")).toBe(false);
  });

  it("excludes Next.js static assets", () => {
    expect(matchesMiddleware("/_next/static/chunk.js")).toBe(false);
    expect(matchesMiddleware("/_next/image?url=foo")).toBe(false);
  });

  it("excludes uploads", () => {
    expect(matchesMiddleware("/uploads/image.jpg")).toBe(false);
  });

  it("excludes published site routes", () => {
    expect(matchesMiddleware("/s/my-site")).toBe(false);
    expect(matchesMiddleware("/s/my-site/about")).toBe(false);
  });

  it("excludes favicon", () => {
    expect(matchesMiddleware("/favicon.ico")).toBe(false);
  });
});
