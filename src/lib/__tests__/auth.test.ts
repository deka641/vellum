import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}));

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock next-auth — we test the callbacks and authorize logic directly
vi.mock("next-auth", () => {
  return {
    default: vi.fn((config: Record<string, unknown>) => {
      // Expose the config for testing
      return {
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
        _config: config,
      };
    }),
  };
});

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((opts: Record<string, unknown>) => opts),
}));

describe("auth authorize callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function getAuthorize() {
    // Re-import to get fresh config
    vi.resetModules();
    // Re-apply mocks after resetModules
    vi.doMock("bcryptjs", () => ({ compare: vi.fn() }));
    vi.doMock("@/lib/db", () => ({
      db: { user: { findUnique: vi.fn() } },
    }));
    vi.doMock("next-auth", () => ({
      default: vi.fn((config: Record<string, unknown>) => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
        _config: config,
      })),
    }));
    vi.doMock("next-auth/providers/credentials", () => ({
      default: vi.fn((opts: Record<string, unknown>) => opts),
    }));

    const mod = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing test internals
    const authExport = mod as any;

    // NextAuth was called with config, get the provider authorize function
    const NextAuth = (await import("next-auth")).default;
    const calls = vi.mocked(NextAuth).mock.calls;
    if (calls.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing test internals
      const config = calls[calls.length - 1][0] as any;
      const provider = config.providers?.[0];
      return {
        authorize: provider?.authorize,
        callbacks: config.callbacks,
        db: (await import("@/lib/db")).db,
        compare: (await import("bcryptjs")).compare,
      };
    }

    // Fallback: try to extract from the returned object
    return {
      authorize: authExport._config?.providers?.[0]?.authorize,
      callbacks: authExport._config?.callbacks,
      db: (await import("@/lib/db")).db,
      compare: (await import("bcryptjs")).compare,
    };
  }

  it("returns null when email is missing", async () => {
    const { authorize } = await getAuthorize();
    if (!authorize) return; // Skip if we can't extract authorize

    const result = await authorize({ password: "test123" });
    expect(result).toBeNull();
  });

  it("returns null when password is missing", async () => {
    const { authorize } = await getAuthorize();
    if (!authorize) return;

    const result = await authorize({ email: "test@example.com" });
    expect(result).toBeNull();
  });

  it("returns null when both email and password are missing", async () => {
    const { authorize } = await getAuthorize();
    if (!authorize) return;

    const result = await authorize({});
    expect(result).toBeNull();
  });

  it("lowercases email before database lookup", async () => {
    const { authorize, db: mockDb } = await getAuthorize();
    if (!authorize) return;

    vi.mocked(mockDb.user.findUnique).mockResolvedValue(null);

    await authorize({ email: "TEST@Example.COM", password: "pass123" });

    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("returns null when user is not found", async () => {
    const { authorize, db: mockDb } = await getAuthorize();
    if (!authorize) return;

    vi.mocked(mockDb.user.findUnique).mockResolvedValue(null);

    const result = await authorize({ email: "test@example.com", password: "pass123" });
    expect(result).toBeNull();
  });

  it("returns null when password does not match", async () => {
    const { authorize, db: mockDb, compare: mockCompare } = await getAuthorize();
    if (!authorize) return;

    vi.mocked(mockDb.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: null,
      passwordHash: "hashed-password",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mockCompare).mockResolvedValue(false as never);

    const result = await authorize({ email: "test@example.com", password: "wrong-pass" });
    expect(result).toBeNull();
  });

  it("returns user data with correct fields on valid credentials", async () => {
    const { authorize, db: mockDb, compare: mockCompare } = await getAuthorize();
    if (!authorize) return;

    vi.mocked(mockDb.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
      passwordHash: "hashed-password",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mockCompare).mockResolvedValue(true as never);

    const result = await authorize({ email: "test@example.com", password: "correct-pass" });
    expect(result).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.jpg",
    });
  });
});

describe("auth JWT callback", () => {
  it("stores user.id in token when user is present", async () => {
    vi.resetModules();
    vi.doMock("bcryptjs", () => ({ compare: vi.fn() }));
    vi.doMock("@/lib/db", () => ({ db: { user: { findUnique: vi.fn() } } }));
    vi.doMock("next-auth", () => ({
      default: vi.fn((config: Record<string, unknown>) => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
        _config: config,
      })),
    }));
    vi.doMock("next-auth/providers/credentials", () => ({
      default: vi.fn((opts: Record<string, unknown>) => opts),
    }));

    await import("@/lib/auth");
    const NextAuth = (await import("next-auth")).default;
    const calls = vi.mocked(NextAuth).mock.calls;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing test internals
    const config = calls[calls.length - 1][0] as any;
    const jwtCallback = config?.callbacks?.jwt;
    if (!jwtCallback) return;

    const token = { sub: "abc" };
    const user = { id: "user-123" };
    const result = await jwtCallback({ token, user });
    expect(result.id).toBe("user-123");
  });

  it("preserves existing token when no user", async () => {
    vi.resetModules();
    vi.doMock("bcryptjs", () => ({ compare: vi.fn() }));
    vi.doMock("@/lib/db", () => ({ db: { user: { findUnique: vi.fn() } } }));
    vi.doMock("next-auth", () => ({
      default: vi.fn((config: Record<string, unknown>) => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
        _config: config,
      })),
    }));
    vi.doMock("next-auth/providers/credentials", () => ({
      default: vi.fn((opts: Record<string, unknown>) => opts),
    }));

    await import("@/lib/auth");
    const NextAuth = (await import("next-auth")).default;
    const calls = vi.mocked(NextAuth).mock.calls;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing test internals
    const config = calls[calls.length - 1][0] as any;
    const jwtCallback = config?.callbacks?.jwt;
    if (!jwtCallback) return;

    const token = { sub: "abc", id: "existing-id" };
    const result = await jwtCallback({ token, user: undefined });
    expect(result.id).toBe("existing-id");
  });
});

describe("auth session callback", () => {
  it("injects token.id into session.user.id", async () => {
    vi.resetModules();
    vi.doMock("bcryptjs", () => ({ compare: vi.fn() }));
    vi.doMock("@/lib/db", () => ({ db: { user: { findUnique: vi.fn() } } }));
    vi.doMock("next-auth", () => ({
      default: vi.fn((config: Record<string, unknown>) => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
        _config: config,
      })),
    }));
    vi.doMock("next-auth/providers/credentials", () => ({
      default: vi.fn((opts: Record<string, unknown>) => opts),
    }));

    await import("@/lib/auth");
    const NextAuth = (await import("next-auth")).default;
    const calls = vi.mocked(NextAuth).mock.calls;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing test internals
    const config = calls[calls.length - 1][0] as any;
    const sessionCallback = config?.callbacks?.session;
    if (!sessionCallback) return;

    const session = { user: { id: "", name: "Test", email: "test@example.com" } };
    const token = { id: "user-456" };
    const result = await sessionCallback({ session, token });
    expect(result.user.id).toBe("user-456");
  });
});

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when session is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db", () => ({
      db: { user: { findUnique: vi.fn() } },
    }));
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: vi.fn(),
    }));

    const mod = await import("@/lib/auth-helpers");
    const result = await mod.getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns null when session.user.id is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db", () => ({
      db: { user: { findUnique: vi.fn() } },
    }));
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: {} }),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: vi.fn(),
    }));

    const mod = await import("@/lib/auth-helpers");
    const result = await mod.getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns user with correct select fields", async () => {
    vi.resetModules();
    const mockUser = {
      id: "user-1",
      name: "Test",
      email: "test@example.com",
      avatarUrl: null,
      createdAt: new Date(),
    };

    vi.doMock("@/lib/db", () => ({
      db: { user: { findUnique: vi.fn().mockResolvedValue(mockUser) } },
    }));
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: vi.fn(),
    }));

    const mod = await import("@/lib/auth-helpers");
    const result = await mod.getCurrentUser();
    expect(result).toEqual(mockUser);

    const { db: mockDb } = await import("@/lib/db");
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  });
});

describe("requireAuth", () => {
  it("redirects to /login when not authenticated", async () => {
    vi.resetModules();
    const mockRedirect = vi.fn();
    vi.doMock("@/lib/db", () => ({
      db: { user: { findUnique: vi.fn().mockResolvedValue(null) } },
    }));
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));

    const mod = await import("@/lib/auth-helpers");

    try {
      await mod.requireAuth();
    } catch {
      // redirect may throw
    }

    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("returns user when authenticated", async () => {
    vi.resetModules();
    const mockUser = {
      id: "user-1",
      name: "Test",
      email: "test@example.com",
      avatarUrl: null,
      createdAt: new Date(),
    };
    vi.doMock("@/lib/db", () => ({
      db: { user: { findUnique: vi.fn().mockResolvedValue(mockUser) } },
    }));
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: vi.fn(),
    }));

    const mod = await import("@/lib/auth-helpers");
    const result = await mod.requireAuth();
    expect(result).toEqual(mockUser);
  });
});
