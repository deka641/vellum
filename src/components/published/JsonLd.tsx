/**
 * Escape a string for safe embedding inside a <script> tag.
 * Replaces <, >, & with Unicode escapes to prevent </script> injection.
 */
function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

interface WebSiteJsonLdProps {
  name: string;
  description?: string | null;
  url: string;
}

export function WebSiteJsonLd({ name, description, url }: WebSiteJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
  };
  if (description) {
    data.description = description;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

interface WebPageJsonLdProps {
  name: string;
  description?: string | null;
  url: string;
  datePublished?: Date | null;
  dateModified?: Date | null;
  isPartOf: { name: string; url: string };
}

export function WebPageJsonLd({
  name,
  description,
  url,
  datePublished,
  dateModified,
  isPartOf,
}: WebPageJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: isPartOf.name,
      url: isPartOf.url,
    },
  };
  if (description) {
    data.description = description;
  }
  if (datePublished) {
    data.datePublished = datePublished.toISOString();
  }
  if (dateModified) {
    data.dateModified = dateModified.toISOString();
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  // Google requires at least 2 items for breadcrumbs to be useful
  if (items.length < 2) return null;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqJsonLdProps {
  items: FaqItem[];
}

export function FaqJsonLd({ items }: FaqJsonLdProps) {
  if (items.length === 0) return null;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

interface ArticleJsonLdProps {
  title: string;
  description?: string | null;
  url: string;
  datePublished: Date;
  dateModified?: Date | null;
  ogImage?: string | null;
  siteName: string;
  isBlogPost?: boolean;
  authorName?: string | null;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  ogImage,
  siteName,
  isBlogPost,
  authorName,
}: ArticleJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isBlogPost ? "BlogPosting" : "Article",
    headline: title,
    url,
    datePublished: datePublished.toISOString(),
    author: {
      "@type": "Person",
      name: authorName || siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
    },
  };
  if (description) {
    data.description = description;
  }
  if (dateModified) {
    data.dateModified = dateModified.toISOString();
  }
  if (ogImage) {
    data.image = ogImage;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

interface ContactPageJsonLdProps {
  name: string;
  url: string;
}

export function ContactPageJsonLd({ name, url }: ContactPageJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
