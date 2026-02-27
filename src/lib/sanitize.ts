import sanitize from "sanitize-html";

// Allowlist derived from TipTap StarterKit + Link extension
const TIPTAP_ALLOWED_TAGS = [
  "p", "br", "hr", "blockquote", "pre", "code",
  "h1", "h2", "h3", "h4",
  "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "ul", "ol", "li",
  "a",
];

const TIPTAP_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel"],
};

const TIPTAP_ALLOWED_SCHEMES = ["http", "https", "mailto"];

/**
 * Sanitize rich-text HTML from TipTap editor blocks.
 * Only allows tags/attributes that TipTap's StarterKit + Link can produce.
 */
export function sanitizeRichHtml(html: string): string {
  return sanitize(html, {
    allowedTags: TIPTAP_ALLOWED_TAGS,
    allowedAttributes: TIPTAP_ALLOWED_ATTRIBUTES,
    allowedSchemes: TIPTAP_ALLOWED_SCHEMES,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
        },
      }),
    },
  });
}

/**
 * Sanitize plain text by stripping all HTML tags.
 * Use for fields that should never contain markup (titles, descriptions, etc.)
 */
export function sanitizePlainText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return sanitize(text, { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Sanitize a URL value. Allows http:, https:, mailto:, relative paths, and anchors.
 * Returns "#" for unsafe URLs (javascript:, data:, vbscript:, etc.)
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "#";
  const trimmed = url.trim();

  // Allow relative paths and anchors
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;

  // Allow safe schemes
  try {
    const parsed = new URL(trimmed);
    const scheme = parsed.protocol.replace(":", "").toLowerCase();
    if (["http", "https", "mailto"].includes(scheme)) return trimmed;
  } catch {
    // Not an absolute URL — could be a bare path like "page.html"
    // Block anything with a colon (potential scheme) that isn't allowed
    if (trimmed.includes(":")) return "#";
    return trimmed;
  }

  return "#";
}

/**
 * Sanitize an image src. Stricter than sanitizeUrl — only http:, https:, and relative paths.
 * Returns "" for unsafe values.
 */
export function sanitizeImageSrc(src: string): string {
  if (!src || typeof src !== "string") return "";
  const trimmed = src.trim();

  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const scheme = parsed.protocol.replace(":", "").toLowerCase();
    if (["http", "https"].includes(scheme)) return trimmed;
  } catch {
    if (trimmed.includes(":")) return "";
    return trimmed;
  }

  return "";
}

const YOUTUBE_HOSTNAMES = ["www.youtube.com", "youtube.com", "youtu.be"];
const VIMEO_HOSTNAMES = ["www.vimeo.com", "vimeo.com"];
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Parse a YouTube/Vimeo URL and return a safe embed URL.
 * Returns null if the URL is invalid, not from a recognized host, or the video ID is suspicious.
 */
export function getSafeVideoEmbedUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url.trim());

    if (YOUTUBE_HOSTNAMES.includes(parsed.hostname)) {
      const videoId = parsed.hostname === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v");
      if (videoId && VIDEO_ID_PATTERN.test(videoId)) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (VIMEO_HOSTNAMES.includes(parsed.hostname)) {
      const videoId = parsed.pathname.split("/").pop();
      if (videoId && VIDEO_ID_PATTERN.test(videoId)) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
  } catch {
    // invalid URL
  }

  return null;
}

/**
 * Sanitize embed/HTML code for the code block.
 * Allows iframes with https:// src only. Strips scripts and event handlers.
 */
export function sanitizeEmbedHtml(code: string): string {
  return sanitize(code, {
    allowedTags: [
      "iframe", "div", "span", "p", "a", "img", "br", "hr",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "em", "b", "i", "u",
      "ul", "ol", "li",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code",
      "figure", "figcaption",
    ],
    allowedAttributes: {
      iframe: ["src", "width", "height", "frameborder", "allowfullscreen", "title", "style"],
      div: ["style", "class"],
      span: ["style", "class"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "style"],
      "*": ["id"],
    },
    allowedSchemes: ["http", "https"],
    allowedIframeHostnames: [
      "www.youtube.com", "youtube.com",
      "player.vimeo.com", "vimeo.com",
      "open.spotify.com",
      "w.soundcloud.com",
      "codepen.io",
      "codesandbox.io",
      "docs.google.com",
      "www.google.com",
      "calendar.google.com",
      "maps.google.com",
      "www.figma.com",
    ],
    transformTags: {
      iframe: (tagName, attribs) => {
        // Only allow https:// src on iframes
        if (attribs.src) {
          try {
            const url = new URL(attribs.src);
            if (url.protocol !== "https:") {
              return { tagName: "div", attribs: {} };
            }
          } catch {
            return { tagName: "div", attribs: {} };
          }
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            sandbox: "allow-scripts allow-popups",
          },
        };
      },
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
    },
  });
}

interface BlockLike {
  id?: string;
  type: string;
  content: Record<string, unknown>;
  settings?: Record<string, unknown>;
  parentId?: string | null;
}

/**
 * Sanitize a single block's content based on its type.
 * Returns a new block object with sanitized content.
 */
function sanitizeBlockContent(block: BlockLike): BlockLike {
  const content = { ...block.content };

  switch (block.type) {
    case "heading":
      if (typeof content.text === "string") {
        content.text = sanitize(content.text, { allowedTags: [], allowedAttributes: {} });
      }
      break;

    case "text":
      if (typeof content.html === "string") {
        content.html = sanitizeRichHtml(content.html);
      }
      break;

    case "button":
      if (typeof content.text === "string") {
        content.text = sanitize(content.text, { allowedTags: [], allowedAttributes: {} });
      }
      if (typeof content.url === "string") {
        content.url = sanitizeUrl(content.url);
      }
      break;

    case "image":
      if (typeof content.src === "string") {
        content.src = sanitizeImageSrc(content.src);
      }
      break;

    case "video":
      if (typeof content.url === "string") {
        content.url = sanitizeUrl(content.url);
      }
      break;

    case "columns":
      if (Array.isArray(content.columns)) {
        content.columns = (content.columns as Array<{ blocks: BlockLike[] }>).map(
          (col) => ({
            ...col,
            blocks: Array.isArray(col.blocks) ? sanitizeBlocks(col.blocks) : [],
          })
        );
      }
      break;

    case "quote":
      if (typeof content.text === "string") {
        content.text = sanitize(content.text, { allowedTags: [], allowedAttributes: {} });
      }
      if (typeof content.attribution === "string") {
        content.attribution = sanitize(content.attribution, { allowedTags: [], allowedAttributes: {} });
      }
      break;

    case "form":
      if (Array.isArray(content.fields)) {
        content.fields = (content.fields as Array<Record<string, unknown>>).map((field) => ({
          ...field,
          label: typeof field.label === "string"
            ? sanitize(field.label, { allowedTags: [], allowedAttributes: {} })
            : field.label,
          placeholder: typeof field.placeholder === "string"
            ? sanitize(field.placeholder, { allowedTags: [], allowedAttributes: {} })
            : field.placeholder,
          pattern: typeof field.pattern === "string" && field.pattern.length <= 200
            ? field.pattern
            : undefined,
          patternMessage: typeof field.patternMessage === "string"
            ? sanitize(field.patternMessage, { allowedTags: [], allowedAttributes: {} }).slice(0, 200)
            : undefined,
        }));
      }
      if (typeof content.submitText === "string") {
        content.submitText = sanitize(content.submitText, { allowedTags: [], allowedAttributes: {} });
      }
      if (typeof content.successMessage === "string") {
        content.successMessage = sanitize(content.successMessage, { allowedTags: [], allowedAttributes: {} });
      }
      break;

    case "code":
      if (content.displayMode === "snippet") {
        // Snippet mode: code is plain text, strip all HTML
        if (typeof content.code === "string") {
          content.code = sanitize(content.code, { allowedTags: [], allowedAttributes: {} });
        }
        // Validate snippetLanguage against known list
        if (typeof content.snippetLanguage === "string") {
          const KNOWN_SNIPPET_LANGUAGES = [
            "javascript", "typescript", "python", "html", "css",
            "json", "bash", "sql", "go", "rust", "php", "plaintext",
          ];
          if (!KNOWN_SNIPPET_LANGUAGES.includes(content.snippetLanguage)) {
            content.snippetLanguage = "plaintext";
          }
        }
      } else {
        // Embed mode (default): sanitize as embed HTML
        if (typeof content.code === "string") {
          content.code = sanitizeEmbedHtml(content.code);
        }
      }
      break;

    case "social":
      if (Array.isArray(content.links)) {
        content.links = (content.links as Array<{ platform: string; url: string }>).map((link) => ({
          platform: typeof link.platform === "string"
            ? sanitize(link.platform, { allowedTags: [], allowedAttributes: {} })
            : link.platform,
          url: typeof link.url === "string" ? sanitizeUrl(link.url) : "#",
        }));
      }
      break;

    case "accordion":
      if (Array.isArray(content.items)) {
        content.items = (content.items as Array<{ id: string; title: string; content: string }>).map((item) => ({
          id: typeof item.id === "string" ? item.id : "",
          title: typeof item.title === "string"
            ? sanitize(item.title, { allowedTags: [], allowedAttributes: {} })
            : "",
          content: typeof item.content === "string"
            ? sanitizeRichHtml(item.content)
            : "",
        }));
      }
      break;

    case "table":
      if (Array.isArray(content.headers)) {
        content.headers = (content.headers as string[]).map((h) =>
          typeof h === "string" ? sanitizeRichHtml(h) : ""
        );
      }
      if (Array.isArray(content.rows)) {
        content.rows = (content.rows as string[][]).map((row) =>
          Array.isArray(row) ? row.map((cell) =>
            typeof cell === "string" ? sanitizeRichHtml(cell) : ""
          ) : []
        );
      }
      if (typeof content.caption === "string") {
        content.caption = sanitize(content.caption, { allowedTags: [], allowedAttributes: {} });
      }
      break;
  }

  return { ...block, content } as BlockLike;
}

/**
 * Sanitize an array of blocks. Use this in API handlers before persisting.
 */
export function sanitizeBlocks(blocks: BlockLike[]): BlockLike[] {
  return blocks.map(sanitizeBlockContent);
}
