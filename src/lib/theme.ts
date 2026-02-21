// Theme engine — types, presets, color math, CSS variable generation

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
}

export type FontPreset = "modern" | "clean" | "classic" | "bold" | "elegant";

export interface SiteTheme {
  colors: ThemeColors;
  fontPreset: FontPreset;
}

// --- Font Presets ---

export interface FontPresetConfig {
  label: string;
  heading: string;
  body: string;
  googleFontsUrl: string | null;
}

export const FONT_PRESETS: Record<FontPreset, FontPresetConfig> = {
  modern: {
    label: "Modern",
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsUrl: null,
  },
  clean: {
    label: "Clean",
    heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsUrl: null,
  },
  classic: {
    label: "Classic",
    heading: "'Lora', Georgia, serif",
    body: "'Merriweather', Georgia, serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Merriweather:wght@400;700&display=swap",
  },
  bold: {
    label: "Bold",
    heading: "'Montserrat', -apple-system, sans-serif",
    body: "'Montserrat', -apple-system, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
  },
  elegant: {
    label: "Elegant",
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Raleway', -apple-system, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Raleway:wght@400;500;600&display=swap",
  },
};

// --- Color Presets ---

export interface ColorPresetConfig {
  label: string;
  colors: ThemeColors;
}

export const COLOR_PRESETS: Record<string, ColorPresetConfig> = {
  warm: {
    label: "Warm",
    colors: {
      primary: "#6366F1",
      background: "#FAF9F7",
      surface: "#FFFFFF",
      text: "#1C1917",
    },
  },
  ocean: {
    label: "Ocean",
    colors: {
      primary: "#0EA5E9",
      background: "#F0F9FF",
      surface: "#FFFFFF",
      text: "#0C4A6E",
    },
  },
  forest: {
    label: "Forest",
    colors: {
      primary: "#059669",
      background: "#F0FDF4",
      surface: "#FFFFFF",
      text: "#14532D",
    },
  },
  sunset: {
    label: "Sunset",
    colors: {
      primary: "#F97316",
      background: "#FFFBEB",
      surface: "#FFFFFF",
      text: "#7C2D12",
    },
  },
  rose: {
    label: "Rose",
    colors: {
      primary: "#E11D48",
      background: "#FFF1F2",
      surface: "#FFFFFF",
      text: "#4C0519",
    },
  },
  dark: {
    label: "Dark",
    colors: {
      primary: "#818CF8",
      background: "#18181B",
      surface: "#27272A",
      text: "#F4F4F5",
    },
  },
};

export const DEFAULT_THEME: SiteTheme = {
  colors: COLOR_PRESETS.warm.colors,
  fontPreset: "modern",
};

// --- Color Math ---

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.min(1, l + (1 - l) * (amount / 100));
  const [nr, ng, nb] = hslToRgb(h, s, newL);
  return rgbToHex(nr, ng, nb);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.max(0, l - l * (amount / 100));
  const [nr, ng, nb] = hslToRgb(h, s, newL);
  return rgbToHex(nr, ng, nb);
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// --- WCAG Contrast Checking ---

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = "fail" | "aa-large" | "aa" | "aaa";

export function getContrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "aaa";
  if (ratio >= 4.5) return "aa";
  if (ratio >= 3) return "aa-large";
  return "fail";
}

export interface ContrastResult {
  pair: string;
  ratio: number;
  level: ContrastLevel;
}

export function validateThemeContrast(theme: SiteTheme): ContrastResult[] {
  const checks = [
    { pair: "Text on Background", fg: theme.colors.text, bg: theme.colors.background },
    { pair: "Text on Surface", fg: theme.colors.text, bg: theme.colors.surface },
    { pair: "Primary on Background", fg: theme.colors.primary, bg: theme.colors.background },
    { pair: "Primary on Surface", fg: theme.colors.primary, bg: theme.colors.surface },
  ];

  return checks.map(({ pair, fg, bg }) => {
    const ratio = getContrastRatio(fg, bg);
    return { pair, ratio, level: getContrastLevel(ratio) };
  });
}

// --- Theme Variable Generation ---

export function generateThemeVariables(
  theme: SiteTheme
): Record<string, string> {
  const { colors, fontPreset } = theme;
  const font = FONT_PRESETS[fontPreset];

  const isLightBg = getLuminance(colors.background) > 0.5;
  const textInverse = isLightBg ? "#1C1917" : "#FAFAF9";

  // For light backgrounds: secondary text = lighten (fade toward white)
  // For dark backgrounds: secondary text = darken (fade toward black)
  const fadeText = isLightBg ? lighten : darken;
  const fadeBg = isLightBg ? darken : lighten;

  return {
    "--color-accent": colors.primary,
    "--color-accent-hover": darken(colors.primary, 10),
    "--color-accent-light": isLightBg
      ? lighten(colors.primary, 90)
      : darken(colors.primary, 70),
    "--color-accent-muted": isLightBg
      ? lighten(colors.primary, 70)
      : darken(colors.primary, 50),
    "--color-bg-primary": colors.background,
    "--color-bg-secondary": fadeBg(colors.background, 3),
    "--color-bg-tertiary": fadeBg(colors.background, 5),
    "--color-surface": colors.surface,
    "--color-surface-hover": fadeBg(colors.surface, 1),
    "--color-text-primary": colors.text,
    "--color-text-secondary": fadeText(colors.text, 30),
    "--color-text-tertiary": fadeText(colors.text, 50),
    "--color-text-inverse": textInverse,
    "--color-border": fadeText(colors.text, 70),
    "--color-border-light": fadeText(colors.text, 80),
    "--color-border-focus": colors.primary,
    "--font-heading": font.heading,
    "--font-body": font.body,
  };
}

// --- Parse site theme from Prisma JSON ---

export function parseSiteTheme(json: unknown): SiteTheme | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  if (!obj.colors || !obj.fontPreset) return null;

  const colors = obj.colors as Record<string, unknown>;
  const hexRe = /^#[0-9a-fA-F]{6}$/;
  if (
    typeof colors.primary !== "string" ||
    !hexRe.test(colors.primary) ||
    typeof colors.background !== "string" ||
    !hexRe.test(colors.background) ||
    typeof colors.surface !== "string" ||
    !hexRe.test(colors.surface) ||
    typeof colors.text !== "string" ||
    !hexRe.test(colors.text)
  ) {
    return null;
  }

  const validPresets = ["modern", "clean", "classic", "bold", "elegant"];
  if (
    typeof obj.fontPreset !== "string" ||
    !validPresets.includes(obj.fontPreset)
  ) {
    return null;
  }

  return {
    colors: {
      primary: colors.primary,
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
    },
    fontPreset: obj.fontPreset as FontPreset,
  };
}
