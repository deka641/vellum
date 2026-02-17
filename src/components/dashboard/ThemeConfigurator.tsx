"use client";

import { useCallback, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import {
  COLOR_PRESETS,
  FONT_PRESETS,
  generateThemeVariables,
  validateThemeContrast,
  type SiteTheme,
  type FontPreset,
} from "@/lib/theme";
import styles from "./theme-configurator.module.css";

interface Props {
  theme: SiteTheme;
  onChange: (theme: SiteTheme) => void;
}

const COLOR_PRESET_KEYS = Object.keys(COLOR_PRESETS);
const FONT_PRESET_KEYS = Object.keys(FONT_PRESETS) as FontPreset[];

function getActiveColorPreset(theme: SiteTheme): string | null {
  for (const key of COLOR_PRESET_KEYS) {
    const preset = COLOR_PRESETS[key];
    if (
      preset.colors.primary === theme.colors.primary &&
      preset.colors.background === theme.colors.background &&
      preset.colors.surface === theme.colors.surface &&
      preset.colors.text === theme.colors.text
    ) {
      return key;
    }
  }
  return null;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ThemeConfigurator({ theme, onChange }: Props) {
  const activeColorPreset = getActiveColorPreset(theme);
  const themeVars = useMemo(() => generateThemeVariables(theme), [theme]);

  const setColorPreset = useCallback(
    (key: string) => {
      onChange({ ...theme, colors: { ...COLOR_PRESETS[key].colors } });
    },
    [theme, onChange]
  );

  const setFontPreset = useCallback(
    (preset: FontPreset) => {
      onChange({ ...theme, fontPreset: preset });
    },
    [theme, onChange]
  );

  const setColor = useCallback(
    (field: keyof SiteTheme["colors"], value: string) => {
      if (!HEX_RE.test(value)) return;
      onChange({
        ...theme,
        colors: { ...theme.colors, [field]: value },
      });
    },
    [theme, onChange]
  );

  const contrastResults = useMemo(() => validateThemeContrast(theme), [theme]);

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Theme</h2>

      {/* Color Palette Presets */}
      <h3 className={styles.subsectionTitle}>Color Palette</h3>
      <div className={styles.paletteGrid}>
        {COLOR_PRESET_KEYS.map((key) => {
          const preset = COLOR_PRESETS[key];
          const isActive = activeColorPreset === key;
          return (
            <button
              key={key}
              type="button"
              className={`${styles.paletteCard} ${isActive ? styles.paletteCardActive : ""}`}
              onClick={() => setColorPreset(key)}
            >
              <div className={styles.paletteSwatches}>
                <span
                  className={styles.paletteSwatch}
                  style={{ background: preset.colors.primary }}
                />
                <span
                  className={styles.paletteSwatch}
                  style={{ background: preset.colors.background }}
                />
                <span
                  className={styles.paletteSwatch}
                  style={{ background: preset.colors.surface }}
                />
                <span
                  className={styles.paletteSwatch}
                  style={{ background: preset.colors.text }}
                />
              </div>
              <span className={styles.paletteLabel}>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Color Inputs */}
      <h3 className={styles.subsectionTitle}>Custom Colors</h3>
      <div className={styles.colorInputs}>
        {(
          [
            ["primary", "Primary / Accent"],
            ["background", "Background"],
            ["surface", "Surface"],
            ["text", "Text"],
          ] as const
        ).map(([field, label]) => (
          <div key={field} className={styles.colorRow}>
            <span className={styles.colorLabel}>{label}</span>
            <div className={styles.colorPickerWrapper}>
              <input
                type="color"
                className={styles.colorPickerInput}
                value={theme.colors[field]}
                onChange={(e) => setColor(field, e.target.value)}
              />
            </div>
            <input
              type="text"
              className={styles.hexInput}
              value={theme.colors[field]}
              onChange={(e) => {
                const v = e.target.value;
                if (HEX_RE.test(v)) setColor(field, v);
                // Allow typing by updating raw value through parent
                // Only call setColor when valid
              }}
              onBlur={(e) => {
                // Reset to valid value if typed value is invalid
                if (!HEX_RE.test(e.target.value)) {
                  e.target.value = theme.colors[field];
                }
              }}
              maxLength={7}
              spellCheck={false}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Contrast Warnings */}
      {contrastResults.some((r) => r.level === "fail" || r.level === "aa-large") && (
        <div className={styles.contrastWarning}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Contrast issues detected</strong>
            {contrastResults
              .filter((r) => r.level === "fail")
              .map((r) => (
                <div key={r.pair} className={styles.contrastFail}>
                  {r.pair}: {r.ratio.toFixed(1)}:1 &mdash; Fails WCAG AA
                </div>
              ))}
            {contrastResults
              .filter((r) => r.level === "aa-large")
              .map((r) => (
                <div key={r.pair} className={styles.contrastWarn}>
                  {r.pair}: {r.ratio.toFixed(1)}:1 &mdash; Passes only for large text
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Font Presets */}
      <h3 className={styles.subsectionTitle}>Font Pairing</h3>
      <div className={styles.fontGrid}>
        {FONT_PRESET_KEYS.map((key) => {
          const preset = FONT_PRESETS[key];
          const isActive = theme.fontPreset === key;
          return (
            <button
              key={key}
              type="button"
              className={`${styles.fontCard} ${isActive ? styles.fontCardActive : ""}`}
              onClick={() => setFontPreset(key)}
            >
              <span className={styles.fontCardLabel}>{preset.label}</span>
              <span
                className={styles.fontCardHeading}
                style={{ fontFamily: preset.heading }}
              >
                The quick brown fox
              </span>
              <span
                className={styles.fontCardBody}
                style={{ fontFamily: preset.body }}
              >
                Jumps over the lazy dog. Pack my box with five dozen liquor jugs.
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Preview */}
      <h3 className={styles.subsectionTitle}>Preview</h3>
      <div className={styles.preview} style={themeVars as React.CSSProperties}>
        <div
          className={styles.previewHeader}
          style={{
            background: themeVars["--color-surface"],
            borderColor: themeVars["--color-border"],
          }}
        >
          <span
            className={styles.previewSiteName}
            style={{
              fontFamily: themeVars["--font-heading"],
              color: themeVars["--color-text-primary"],
            }}
          >
            My Site
          </span>
          <span
            className={styles.previewNav}
            style={{
              color: themeVars["--color-text-secondary"],
              fontFamily: themeVars["--font-body"],
            }}
          >
            Home &nbsp; About &nbsp; Contact
          </span>
        </div>
        <div
          className={styles.previewBody}
          style={{ background: themeVars["--color-bg-primary"] }}
        >
          <div
            className={styles.previewHeading}
            style={{
              fontFamily: themeVars["--font-heading"],
              color: themeVars["--color-text-primary"],
            }}
          >
            Welcome to Your Site
          </div>
          <div
            className={styles.previewText}
            style={{
              fontFamily: themeVars["--font-body"],
              color: themeVars["--color-text-secondary"],
            }}
          >
            This is how your published pages will look with the selected theme.
            Colors, fonts, and all visual elements adapt automatically.
          </div>
          <span
            className={styles.previewButton}
            style={{ background: themeVars["--color-accent"] }}
          >
            Get Started
          </span>
        </div>
      </div>
    </div>
  );
}
