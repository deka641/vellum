/**
 * Content Performance Score — combines SEO audit, page views, content depth,
 * and recency into a single 0-100 score per page.
 *
 * Weights: SEO (40%), Views/Trend (30%), Content Depth (20%), Recency (10%)
 */

export interface ContentScoreInput {
  seoScore: number; // 0-100 from runSeoAudit
  views: number; // Total views in the period
  maxViews: number; // Max views across all pages (for normalization)
  wordCount: number;
  publishedAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface ContentScore {
  total: number; // 0-100
  label: "excellent" | "good" | "needs-work" | "poor";
  breakdown: {
    seo: number;
    views: number;
    content: number;
    recency: number;
  };
}

const WEIGHTS = {
  seo: 0.4,
  views: 0.3,
  content: 0.2,
  recency: 0.1,
};

/**
 * Compute a content performance score for a single page.
 */
export function computeContentScore(input: ContentScoreInput): ContentScore {
  // SEO component: direct pass-through (already 0-100)
  const seo = Math.min(100, Math.max(0, input.seoScore));

  // Views component: normalized against the best-performing page
  let views = 0;
  if (input.maxViews > 0 && input.views > 0) {
    // Logarithmic scale to avoid one viral page dominating
    views = Math.min(100, (Math.log(input.views + 1) / Math.log(input.maxViews + 1)) * 100);
  }

  // Content depth: word count scoring
  // <100 words = poor, 100-300 = basic, 300-800 = good, 800+ = excellent
  let content = 0;
  if (input.wordCount >= 800) content = 100;
  else if (input.wordCount >= 300) content = 60 + ((input.wordCount - 300) / 500) * 40;
  else if (input.wordCount >= 100) content = 20 + ((input.wordCount - 100) / 200) * 40;
  else content = (input.wordCount / 100) * 20;

  // Recency: how recently was the page updated?
  // Updated within 7 days = 100, 30 days = 70, 90 days = 40, 180+ days = 10
  let recency = 50; // default if no dates
  const refDate = input.updatedAt || input.publishedAt;
  if (refDate) {
    const daysSince = Math.max(0, (Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) recency = 100;
    else if (daysSince <= 30) recency = 70 + ((30 - daysSince) / 23) * 30;
    else if (daysSince <= 90) recency = 40 + ((90 - daysSince) / 60) * 30;
    else if (daysSince <= 180) recency = 10 + ((180 - daysSince) / 90) * 30;
    else recency = 10;
  }

  const total = Math.round(
    seo * WEIGHTS.seo +
    views * WEIGHTS.views +
    content * WEIGHTS.content +
    recency * WEIGHTS.recency
  );

  let label: ContentScore["label"];
  if (total >= 80) label = "excellent";
  else if (total >= 60) label = "good";
  else if (total >= 40) label = "needs-work";
  else label = "poor";

  return {
    total,
    label,
    breakdown: {
      seo: Math.round(seo),
      views: Math.round(views),
      content: Math.round(content),
      recency: Math.round(recency),
    },
  };
}

/**
 * Get the CSS color for a content score label.
 */
export function getScoreColor(label: ContentScore["label"]): string {
  switch (label) {
    case "excellent": return "var(--color-success)";
    case "good": return "var(--color-accent)";
    case "needs-work": return "var(--color-warning)";
    case "poor": return "var(--color-error)";
  }
}
