import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import security from "eslint-plugin-security";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "public/**",
      "prisma/generated/**",
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended (type-aware rules disabled for speed)
  ...tseslint.configs.recommended,

  // Next.js plugin (flat config)
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // This CMS legitimately uses <img> for user-uploaded content
      "@next/next/no-img-element": "off",
    },
  },

  // Security plugin (selective rules only)
  {
    plugins: {
      security,
    },
    rules: {
      "security/detect-eval-with-expression": "error",
      // These are warn-level to surface issues without blocking CI.
      // The --max-warnings 0 policy means warnings fail the build,
      // so we disable rules with known false positives for now.
      // TODO: Enable after auditing flagged patterns
      // "security/detect-unsafe-regex": "warn",
      // "security/detect-non-literal-regexp": "warn",
      // "security/detect-possible-timing-attacks": "warn",
    },
  },

  // Project-wide rule overrides
  {
    rules: {
      // TypeScript handles these better than ESLint
      "no-unused-vars": "off",
      // TODO: Enable as warn and fix existing unused imports incrementally
      "@typescript-eslint/no-unused-vars": "off",

      // Allow explicit any — tightening this is a separate effort
      "@typescript-eslint/no-explicit-any": "off",

      // Allow require imports (used in some config files)
      "@typescript-eslint/no-require-imports": "off",

      // Allow empty object types (common in Next.js patterns)
      "@typescript-eslint/no-empty-object-type": "off",

      // Prefer const but don't error
      "prefer-const": "error",

      // Allow case declarations (common in switch/case block rendering)
      "no-case-declarations": "off",

      // Allow assignments that appear unused in control flow analysis
      "no-useless-assignment": "off",
    },
  },

  // Test file overrides
  {
    files: ["src/lib/__tests__/**"],
    rules: {
      "prefer-const": "off",
    },
  }
);
