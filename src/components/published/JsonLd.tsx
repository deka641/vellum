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
