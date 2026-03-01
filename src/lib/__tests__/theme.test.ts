import { describe, it, expect } from "vitest";
import {
  getContrastRatio,
  getContrastLevel,
  validateThemeContrast,
  generateThemeVariables,
  parseSiteTheme,
  FONT_PRESETS,
  COLOR_PRESETS,
  DEFAULT_THEME,
  type SiteTheme,
} from "../theme";

describe("getContrastRatio", () => {
  it("returns 21 for black on white", () => {
    const ratio = getContrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for same color", () => {
    const ratio = getContrastRatio("#FF0000", "#FF0000");
    expect(ratio).toBeCloseTo(1, 0);
  });

  it("is commutative", () => {
    const r1 = getContrastRatio("#6366F1", "#FAF9F7");
    const r2 = getContrastRatio("#FAF9F7", "#6366F1");
    expect(r1).toBeCloseTo(r2, 5);
  });

  it("returns a value >= 1", () => {
    expect(getContrastRatio("#123456", "#654321")).toBeGreaterThanOrEqual(
      1
    );
  });

  it("returns maximum ratio of 21", () => {
    const ratio = getContrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeLessThanOrEqual(21.1);
  });

  it("gives high contrast for dark text on light bg", () => {
    const ratio = getContrastRatio("#1C1917", "#FAF9F7");
    expect(ratio).toBeGreaterThan(10);
  });

  it("gives lower contrast for similar colors", () => {
    const ratio = getContrastRatio("#CCCCCC", "#DDDDDD");
    expect(ratio).toBeLessThan(2);
  });
});

describe("getContrastLevel", () => {
  it("returns aaa for ratio >= 7", () => {
    expect(getContrastLevel(7)).toBe("aaa");
    expect(getContrastLevel(21)).toBe("aaa");
  });

  it("returns aa for ratio >= 4.5", () => {
    expect(getContrastLevel(4.5)).toBe("aa");
    expect(getContrastLevel(6.9)).toBe("aa");
  });

  it("returns aa-large for ratio >= 3", () => {
    expect(getContrastLevel(3)).toBe("aa-large");
    expect(getContrastLevel(4.4)).toBe("aa-large");
  });

  it("returns fail for ratio < 3", () => {
    expect(getContrastLevel(2.9)).toBe("fail");
    expect(getContrastLevel(1)).toBe("fail");
  });

  it("returns aaa at boundary 7.0", () => {
    expect(getContrastLevel(7.0)).toBe("aaa");
  });

  it("returns aa at boundary 4.5", () => {
    expect(getContrastLevel(4.5)).toBe("aa");
  });

  it("returns aa-large at boundary 3.0", () => {
    expect(getContrastLevel(3.0)).toBe("aa-large");
  });
});

describe("validateThemeContrast", () => {
  it("returns 5 contrast results", () => {
    const results = validateThemeContrast(DEFAULT_THEME);
    expect(results).toHaveLength(5);
  });

  it("checks expected pairs", () => {
    const results = validateThemeContrast(DEFAULT_THEME);
    const pairs = results.map((r) => r.pair);
    expect(pairs).toContain("Text on Background");
    expect(pairs).toContain("Text on Surface");
    expect(pairs).toContain("Primary on Background");
    expect(pairs).toContain("Primary on Surface");
    expect(pairs).toContain("Button on Accent");
  });

  it("each result has ratio and level", () => {
    const results = validateThemeContrast(DEFAULT_THEME);
    for (const r of results) {
      expect(r.ratio).toBeGreaterThan(0);
      expect(["fail", "aa-large", "aa", "aaa"]).toContain(r.level);
    }
  });

  it("warm theme text on background passes AA", () => {
    const results = validateThemeContrast(DEFAULT_THEME);
    const textOnBg = results.find(
      (r) => r.pair === "Text on Background"
    );
    expect(textOnBg).toBeDefined();
    expect(textOnBg!.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("works for all color presets", () => {
    for (const [, preset] of Object.entries(COLOR_PRESETS)) {
      const theme: SiteTheme = {
        colors: preset.colors,
        fontPreset: "modern",
      };
      const results = validateThemeContrast(theme);
      expect(results).toHaveLength(5);
      for (const r of results) {
        expect(r.ratio).toBeGreaterThan(0);
      }
    }
  });

  it("Button on Accent uses computed textInverse", () => {
    const results = validateThemeContrast(DEFAULT_THEME);
    const buttonOnAccent = results.find(
      (r) => r.pair === "Button on Accent"
    );
    expect(buttonOnAccent).toBeDefined();
    // The contrast should be reasonable since textInverse is chosen for contrast
    expect(buttonOnAccent!.ratio).toBeGreaterThan(1);
  });
});

describe("generateThemeVariables", () => {
  it("returns expected CSS custom properties", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(vars["--color-accent"]).toBe(DEFAULT_THEME.colors.primary);
    expect(vars["--color-bg-primary"]).toBe(
      DEFAULT_THEME.colors.background
    );
    expect(vars["--color-surface"]).toBe(DEFAULT_THEME.colors.surface);
    expect(vars["--color-text-primary"]).toBe(DEFAULT_THEME.colors.text);
    expect(vars["--font-heading"]).toBeTruthy();
    expect(vars["--font-body"]).toBeTruthy();
  });

  it("generates all 19 variables", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(Object.keys(vars).length).toBe(19);
  });

  it("generates shadow-color for light theme", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(vars["--shadow-color"]).toBe("28, 25, 23");
  });

  it("generates shadow-color for dark theme", () => {
    const darkTheme: SiteTheme = {
      colors: COLOR_PRESETS.dark.colors,
      fontPreset: "modern",
    };
    const vars = generateThemeVariables(darkTheme);
    expect(vars["--shadow-color"]).toBe("0, 0, 0");
  });

  it("uses correct font preset", () => {
    const theme: SiteTheme = {
      colors: DEFAULT_THEME.colors,
      fontPreset: "bold",
    };
    const vars = generateThemeVariables(theme);
    expect(vars["--font-heading"]).toBe(FONT_PRESETS.bold.heading);
    expect(vars["--font-body"]).toBe(FONT_PRESETS.bold.body);
  });

  it("uses correct font for each preset", () => {
    const presets: Array<"modern" | "clean" | "classic" | "bold" | "elegant"> = [
      "modern",
      "clean",
      "classic",
      "bold",
      "elegant",
    ];
    for (const preset of presets) {
      const theme: SiteTheme = {
        colors: DEFAULT_THEME.colors,
        fontPreset: preset,
      };
      const vars = generateThemeVariables(theme);
      expect(vars["--font-heading"]).toBe(FONT_PRESETS[preset].heading);
      expect(vars["--font-body"]).toBe(FONT_PRESETS[preset].body);
    }
  });

  it("textInverse has good contrast on primary", () => {
    for (const [, preset] of Object.entries(COLOR_PRESETS)) {
      const theme: SiteTheme = {
        colors: preset.colors,
        fontPreset: "modern",
      };
      const vars = generateThemeVariables(theme);
      const inverse = vars["--color-text-inverse"];
      const ratio = getContrastRatio(inverse, theme.colors.primary);
      // textInverse should have decent contrast on primary
      expect(ratio).toBeGreaterThan(2);
    }
  });

  it("generates accent hover color", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(vars["--color-accent-hover"]).toBeTruthy();
    // Hover should be different from the base accent
    expect(vars["--color-accent-hover"]).not.toBe(vars["--color-accent"]);
  });

  it("generates text hierarchy (primary, secondary, tertiary)", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(vars["--color-text-primary"]).toBeTruthy();
    expect(vars["--color-text-secondary"]).toBeTruthy();
    expect(vars["--color-text-tertiary"]).toBeTruthy();
  });

  it("generates border colors", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(vars["--color-border"]).toBeTruthy();
    expect(vars["--color-border-light"]).toBeTruthy();
    expect(vars["--color-border-focus"]).toBe(DEFAULT_THEME.colors.primary);
  });

  it("generates background variants", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(vars["--color-bg-primary"]).toBeTruthy();
    expect(vars["--color-bg-secondary"]).toBeTruthy();
    expect(vars["--color-bg-tertiary"]).toBeTruthy();
  });

  it("generates surface hover", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    expect(vars["--color-surface-hover"]).toBeTruthy();
  });

  it("all variable values are hex colors or font strings or shadow strings", () => {
    const vars = generateThemeVariables(DEFAULT_THEME);
    for (const [key, value] of Object.entries(vars)) {
      expect(value).toBeTruthy();
      if (key.startsWith("--color-")) {
        // Color vars should be hex colors
        expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
      } else if (key.startsWith("--font-")) {
        // Font vars should be non-empty strings
        expect(value.length).toBeGreaterThan(0);
      } else if (key === "--shadow-color") {
        // Shadow color is RGB values
        expect(value).toMatch(/^\d+, \d+, \d+$/);
      }
    }
  });
});

describe("COLOR_PRESETS", () => {
  it("has 6 presets", () => {
    expect(Object.keys(COLOR_PRESETS)).toHaveLength(6);
  });

  it("contains expected preset names", () => {
    expect(COLOR_PRESETS).toHaveProperty("warm");
    expect(COLOR_PRESETS).toHaveProperty("ocean");
    expect(COLOR_PRESETS).toHaveProperty("forest");
    expect(COLOR_PRESETS).toHaveProperty("sunset");
    expect(COLOR_PRESETS).toHaveProperty("rose");
    expect(COLOR_PRESETS).toHaveProperty("dark");
  });

  it("each preset has label and 4 color keys", () => {
    for (const [, preset] of Object.entries(COLOR_PRESETS)) {
      expect(preset.label).toBeTruthy();
      expect(preset.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.colors.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.colors.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("FONT_PRESETS", () => {
  it("has 5 presets", () => {
    expect(Object.keys(FONT_PRESETS)).toHaveLength(5);
  });

  it("each preset has heading, body, and label", () => {
    for (const [, preset] of Object.entries(FONT_PRESETS)) {
      expect(preset.label).toBeTruthy();
      expect(preset.heading).toBeTruthy();
      expect(preset.body).toBeTruthy();
    }
  });

  it("modern and clean have no Google Fonts URL (built-in fonts)", () => {
    expect(FONT_PRESETS.modern.googleFontsUrl).toBeNull();
    expect(FONT_PRESETS.clean.googleFontsUrl).toBeNull();
  });

  it("classic, bold, elegant have Google Fonts URLs", () => {
    expect(FONT_PRESETS.classic.googleFontsUrl).toContain(
      "fonts.googleapis.com"
    );
    expect(FONT_PRESETS.bold.googleFontsUrl).toContain(
      "fonts.googleapis.com"
    );
    expect(FONT_PRESETS.elegant.googleFontsUrl).toContain(
      "fonts.googleapis.com"
    );
  });
});

describe("DEFAULT_THEME", () => {
  it("uses warm color preset", () => {
    expect(DEFAULT_THEME.colors).toEqual(COLOR_PRESETS.warm.colors);
  });

  it("uses modern font preset", () => {
    expect(DEFAULT_THEME.fontPreset).toBe("modern");
  });
});

describe("parseSiteTheme", () => {
  it("parses valid theme JSON", () => {
    const theme = parseSiteTheme({
      colors: {
        primary: "#6366F1",
        background: "#FAF9F7",
        surface: "#FFFFFF",
        text: "#1C1917",
      },
      fontPreset: "modern",
    });
    expect(theme).not.toBeNull();
    expect(theme!.colors.primary).toBe("#6366F1");
    expect(theme!.fontPreset).toBe("modern");
  });

  it("returns null for null input", () => {
    expect(parseSiteTheme(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseSiteTheme(undefined)).toBeNull();
  });

  it("returns null for non-object", () => {
    expect(parseSiteTheme("string")).toBeNull();
    expect(parseSiteTheme(42)).toBeNull();
  });

  it("returns null for missing colors", () => {
    expect(parseSiteTheme({ fontPreset: "modern" })).toBeNull();
  });

  it("returns null for missing fontPreset", () => {
    expect(
      parseSiteTheme({
        colors: {
          primary: "#6366F1",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
      })
    ).toBeNull();
  });

  it("returns null for invalid hex color", () => {
    expect(
      parseSiteTheme({
        colors: {
          primary: "not-hex",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "modern",
      })
    ).toBeNull();
  });

  it("returns null for 3-digit hex color", () => {
    expect(
      parseSiteTheme({
        colors: {
          primary: "#FFF",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "modern",
      })
    ).toBeNull();
  });

  it("returns null for invalid font preset", () => {
    expect(
      parseSiteTheme({
        colors: {
          primary: "#6366F1",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "invalid",
      })
    ).toBeNull();
  });

  it("accepts all valid font presets", () => {
    const presets = ["modern", "clean", "classic", "bold", "elegant"];
    for (const preset of presets) {
      const theme = parseSiteTheme({
        colors: {
          primary: "#6366F1",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: preset,
      });
      expect(theme).not.toBeNull();
      expect(theme!.fontPreset).toBe(preset);
    }
  });

  it("returns null when primary color is not a string", () => {
    expect(
      parseSiteTheme({
        colors: {
          primary: 123,
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "modern",
      })
    ).toBeNull();
  });
});
