"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Input, Textarea } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/Toast";
import { COLOR_PRESETS, FONT_PRESETS } from "@/lib/theme";
import type { FontPreset } from "@/lib/theme";
import styles from "./new-site.module.css";

const TOTAL_STEPS = 3;

interface StarterPageOption {
  key: string;
  label: string;
  description: string;
}

const STARTER_PAGES: StarterPageOption[] = [
  { key: "homepage", label: "Homepage", description: "A welcoming landing page with hero, features, and CTA" },
  { key: "about", label: "About", description: "Tell your story with text, images, and a team section" },
  { key: "contact", label: "Contact", description: "A contact form so visitors can reach you" },
];

export default function NewSitePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [colorPreset, setColorPreset] = useState("warm");
  const [fontPreset, setFontPreset] = useState<FontPreset>("modern");

  // Step 3
  const [starterPages, setStarterPages] = useState<Set<string>>(new Set(["homepage"]));

  function toggleStarterPage(key: string) {
    setStarterPages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast("Please enter a site name", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          theme: {
            colors: COLOR_PRESETS[colorPreset].colors,
            fontPreset,
          },
          starterPages: Array.from(starterPages),
        }),
      });

      if (res.ok) {
        const site = await res.json();
        toast("Site created!");
        router.push(`/sites/${site.id}`);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to create site", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="Create a new site" />
      <div className={styles.content}>
        {/* Step indicator */}
        <div className={styles.steps}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`${styles.step} ${i < step ? styles.stepActive : ""}`}
            />
          ))}
        </div>

        {/* Step 1: Name & Description */}
        {step === 1 && (
          <div className={styles.form}>
            <div>
              <h2 className={styles.sectionTitle}>Name your site</h2>
              <p className={styles.sectionDesc}>Choose a name and optional description for your new site.</p>
            </div>
            <Input
              label="Site name"
              placeholder="My Portfolio"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              label="Description"
              placeholder="A brief description of your site (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!name.trim()) {
                    toast("Please enter a site name", "error");
                    return;
                  }
                  setStep(2);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Theme */}
        {step === 2 && (
          <div className={styles.form}>
            <div>
              <h2 className={styles.sectionTitle}>Choose a theme</h2>
              <p className={styles.sectionDesc}>Pick a color scheme and font pairing. You can change this later.</p>
            </div>

            <div className={styles.themeGrid}>
              {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`${styles.themeSwatch} ${colorPreset === key ? styles.themeSwatchSelected : ""}`}
                  onClick={() => setColorPreset(key)}
                  type="button"
                >
                  <div className={styles.themeColors}>
                    <div className={styles.themeColorDot} style={{ background: preset.colors.primary }} />
                    <div className={styles.themeColorDot} style={{ background: preset.colors.background }} />
                    <div className={styles.themeColorDot} style={{ background: preset.colors.text }} />
                  </div>
                  <span className={styles.themeLabel}>{preset.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.fontGrid}>
              {(Object.entries(FONT_PRESETS) as [FontPreset, typeof FONT_PRESETS[FontPreset]][]).map(([key, preset]) => (
                <button
                  key={key}
                  className={`${styles.fontOption} ${fontPreset === key ? styles.fontOptionSelected : ""}`}
                  onClick={() => setFontPreset(key)}
                  type="button"
                >
                  <span className={styles.fontSample} style={{ fontFamily: preset.heading }}>
                    Aa Bb Cc
                  </span>
                  <span className={styles.fontName}>{preset.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Starter Pages */}
        {step === 3 && (
          <div className={styles.form}>
            <div>
              <h2 className={styles.sectionTitle}>Starter pages</h2>
              <p className={styles.sectionDesc}>Select pages to pre-create with starter content. You can always add more later.</p>
            </div>

            <div className={styles.starterPages}>
              {STARTER_PAGES.map((page) => (
                <button
                  key={page.key}
                  className={`${styles.starterPage} ${starterPages.has(page.key) ? styles.starterPageSelected : ""}`}
                  onClick={() => toggleStarterPage(page.key)}
                  type="button"
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "var(--radius-sm)",
                      border: starterPages.has(page.key)
                        ? "none"
                        : "2px solid var(--color-border)",
                      background: starterPages.has(page.key)
                        ? "var(--color-accent)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {starterPages.has(page.key) && <Check size={14} color="white" />}
                  </div>
                  <div className={styles.starterPageInfo}>
                    <div className={styles.starterPageName}>{page.label}</div>
                    <div className={styles.starterPageDesc}>{page.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create site"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
