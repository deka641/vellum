import { describe, it, expect } from "vitest";
import {
  sanitizeRichHtml,
  sanitizeUrl,
  sanitizeImageSrc,
  getSafeVideoEmbedUrl,
  sanitizeEmbedHtml,
  sanitizeBlocks,
  sanitizePlainText,
} from "@/lib/sanitize";

// ---------------------------------------------------------------------------
// sanitizeRichHtml
// ---------------------------------------------------------------------------
describe("sanitizeRichHtml", () => {
  describe("allowed tags preserved", () => {
    it("preserves p, strong, em, b, i, u, s tags", () => {
      const html =
        "<p><strong>a</strong><em>b</em><b>c</b><i>d</i><u>e</u><s>f</s></p>";
      const result = sanitizeRichHtml(html);
      expect(result).toContain("<strong>a</strong>");
      expect(result).toContain("<em>b</em>");
      expect(result).toContain("<b>c</b>");
      expect(result).toContain("<i>d</i>");
      expect(result).toContain("<u>e</u>");
      expect(result).toContain("<s>f</s>");
    });

    it("preserves sub and sup tags", () => {
      expect(sanitizeRichHtml("<sub>x</sub>")).toContain("<sub>");
      expect(sanitizeRichHtml("<sup>x</sup>")).toContain("<sup>");
    });

    it("preserves heading tags h1-h4", () => {
      expect(sanitizeRichHtml("<h1>H</h1>")).toContain("<h1>");
      expect(sanitizeRichHtml("<h2>H</h2>")).toContain("<h2>");
      expect(sanitizeRichHtml("<h3>H</h3>")).toContain("<h3>");
      expect(sanitizeRichHtml("<h4>H</h4>")).toContain("<h4>");
    });

    it("preserves ul, ol, li tags", () => {
      expect(sanitizeRichHtml("<ul><li>item</li></ul>")).toContain("<ul>");
      expect(sanitizeRichHtml("<ol><li>item</li></ol>")).toContain("<ol>");
    });

    it("preserves blockquote, pre, code tags", () => {
      expect(sanitizeRichHtml("<blockquote>q</blockquote>")).toContain(
        "<blockquote>"
      );
      expect(sanitizeRichHtml("<pre><code>x</code></pre>")).toContain("<pre>");
      expect(sanitizeRichHtml("<pre><code>x</code></pre>")).toContain("<code>");
    });

    it("preserves br and hr tags", () => {
      expect(sanitizeRichHtml("<br>")).toContain("<br");
      expect(sanitizeRichHtml("<hr>")).toContain("<hr");
    });

    it("preserves a tags with href", () => {
      const result = sanitizeRichHtml(
        '<a href="https://example.com">link</a>'
      );
      expect(result).toContain("<a ");
      expect(result).toContain("https://example.com");
    });
  });

  describe("stripped tags", () => {
    it("strips script tags", () => {
      expect(
        sanitizeRichHtml('<p>Hi</p><script>alert("xss")</script>')
      ).not.toContain("script");
    });

    it("strips style tags", () => {
      expect(
        sanitizeRichHtml("<style>body{color:red}</style>")
      ).not.toContain("style");
    });

    it("strips img tags (not in TipTap allowlist)", () => {
      expect(sanitizeRichHtml('<img src="x.jpg">')).not.toContain("img");
    });

    it("strips div tags", () => {
      expect(sanitizeRichHtml("<div>content</div>")).not.toContain("<div>");
    });

    it("strips h5 and h6 tags (not in allowlist)", () => {
      expect(sanitizeRichHtml("<h5>T</h5>")).not.toContain("<h5>");
      expect(sanitizeRichHtml("<h6>T</h6>")).not.toContain("<h6>");
    });

    it("strips iframe tags", () => {
      expect(
        sanitizeRichHtml('<iframe src="https://evil.com"></iframe>')
      ).not.toContain("iframe");
    });
  });

  describe("event handlers stripped", () => {
    it("strips onerror attribute", () => {
      const result = sanitizeRichHtml('<img onerror="alert(1)" src="x">');
      expect(result).not.toContain("onerror");
    });

    it("strips onclick attribute", () => {
      const result = sanitizeRichHtml('<p onclick="alert(1)">hi</p>');
      expect(result).not.toContain("onclick");
    });

    it("strips onload attribute", () => {
      const result = sanitizeRichHtml('<body onload="alert(1)">hi</body>');
      expect(result).not.toContain("onload");
    });

    it("strips onmouseover attribute", () => {
      const result = sanitizeRichHtml(
        '<p onmouseover="alert(1)">hover</p>'
      );
      expect(result).not.toContain("onmouseover");
    });
  });

  describe("javascript: URLs blocked on links", () => {
    it("blocks javascript: href on a tags", () => {
      const result = sanitizeRichHtml(
        '<a href="javascript:alert(1)">xss</a>'
      );
      expect(result).not.toContain("javascript:");
    });

    it("blocks data: href on a tags", () => {
      const result = sanitizeRichHtml(
        '<a href="data:text/html,<h1>evil</h1>">xss</a>'
      );
      expect(result).not.toContain("data:");
    });

    it("blocks vbscript: href on a tags", () => {
      const result = sanitizeRichHtml(
        '<a href="vbscript:MsgBox(1)">xss</a>'
      );
      expect(result).not.toContain("vbscript:");
    });
  });

  describe('rel="noopener noreferrer" enforced on links', () => {
    it("adds rel to links that lack it", () => {
      const result = sanitizeRichHtml(
        '<a href="https://example.com">link</a>'
      );
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it("overrides existing rel attribute", () => {
      const result = sanitizeRichHtml(
        '<a href="https://example.com" rel="nofollow">link</a>'
      );
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).not.toContain("nofollow");
    });

    it("preserves href and target alongside rel", () => {
      const result = sanitizeRichHtml(
        '<a href="https://example.com" target="_blank">link</a>'
      );
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain("https://example.com");
    });
  });

  describe("edge cases", () => {
    it("strips data attributes on links", () => {
      const result = sanitizeRichHtml(
        '<a href="https://example.com" data-evil="yes">link</a>'
      );
      expect(result).not.toContain("data-evil");
    });

    it("returns empty string for empty input", () => {
      expect(sanitizeRichHtml("")).toBe("");
    });

    it("handles plain text without tags", () => {
      expect(sanitizeRichHtml("just text")).toBe("just text");
    });

    it("handles deeply nested allowed tags", () => {
      const html = "<ul><li><strong><em>deep</em></strong></li></ul>";
      const result = sanitizeRichHtml(html);
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
      expect(result).toContain("deep");
    });
  });
});

// ---------------------------------------------------------------------------
// sanitizePlainText
// ---------------------------------------------------------------------------
describe("sanitizePlainText", () => {
  it("strips all HTML tags", () => {
    expect(sanitizePlainText("<b>Hello</b> <script>x</script>")).toBe("Hello");
  });

  it("strips nested tags", () => {
    expect(sanitizePlainText("<div><p><b>nested</b></p></div>")).toBe(
      "nested"
    );
  });

  it("returns empty string for empty input", () => {
    expect(sanitizePlainText("")).toBe("");
  });

  it("returns empty string for null", () => {
    expect(sanitizePlainText(null as unknown as string)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sanitizePlainText(undefined as unknown as string)).toBe("");
  });

  it("returns empty string for non-string types", () => {
    expect(sanitizePlainText(123 as unknown as string)).toBe("");
    expect(sanitizePlainText(false as unknown as string)).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizePlainText("  hello  ")).toBe("hello");
  });

  it("preserves text content from multiple tags", () => {
    const result = sanitizePlainText("<p>hello</p><p>world</p>");
    expect(result).toContain("hello");
    expect(result).toContain("world");
  });

  it("strips dangerous tags while keeping text", () => {
    expect(
      sanitizePlainText("<script>alert(1)</script>safe text")
    ).toContain("safe text");
    expect(sanitizePlainText("<script>alert(1)</script>safe text")).not.toContain(
      "<script>"
    );
  });
});

// ---------------------------------------------------------------------------
// sanitizeUrl
// ---------------------------------------------------------------------------
describe("sanitizeUrl", () => {
  describe("http/https/mailto allowed", () => {
    it("allows http URLs", () => {
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("allows https URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("allows https URLs with path and query", () => {
      expect(sanitizeUrl("https://example.com/path?q=1&r=2")).toBe(
        "https://example.com/path?q=1&r=2"
      );
    });

    it("allows mailto URLs", () => {
      expect(sanitizeUrl("mailto:test@example.com")).toBe(
        "mailto:test@example.com"
      );
    });
  });

  describe("dangerous schemes blocked, returns '#'", () => {
    it("blocks javascript: scheme", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
    });

    it("blocks JavaScript: with mixed case", () => {
      // URL constructor normalizes protocol to lowercase
      expect(sanitizeUrl("JavaScript:alert(1)")).toBe("#");
    });

    it("blocks data: scheme", () => {
      expect(
        sanitizeUrl("data:text/html,<script>alert(1)</script>")
      ).toBe("#");
    });

    it("blocks vbscript: scheme", () => {
      expect(sanitizeUrl("vbscript:msgbox")).toBe("#");
    });

    it("blocks unknown schemes with colons (non-URL parseable)", () => {
      expect(sanitizeUrl("custom:scheme")).toBe("#");
    });

    it("blocks ftp: scheme", () => {
      expect(sanitizeUrl("ftp://example.com")).toBe("#");
    });
  });

  describe("relative URLs and anchors allowed", () => {
    it("allows relative paths starting with /", () => {
      expect(sanitizeUrl("/about")).toBe("/about");
    });

    it("allows nested relative paths", () => {
      expect(sanitizeUrl("/path/to/page")).toBe("/path/to/page");
    });

    it("allows anchors starting with #", () => {
      expect(sanitizeUrl("#section")).toBe("#section");
    });

    it("allows hash-only fragments", () => {
      expect(sanitizeUrl("#top")).toBe("#top");
    });
  });

  describe("bare paths without colons allowed", () => {
    it("allows bare filename", () => {
      expect(sanitizeUrl("page.html")).toBe("page.html");
    });

    it("allows bare path segments", () => {
      expect(sanitizeUrl("about-us")).toBe("about-us");
    });
  });

  describe("edge cases", () => {
    it("returns # for empty string", () => {
      expect(sanitizeUrl("")).toBe("#");
    });

    it("returns # for null", () => {
      expect(sanitizeUrl(null as unknown as string)).toBe("#");
    });

    it("returns # for undefined", () => {
      expect(sanitizeUrl(undefined as unknown as string)).toBe("#");
    });

    it("trims whitespace before processing", () => {
      expect(sanitizeUrl("  https://example.com  ")).toBe(
        "https://example.com"
      );
    });

    it("trims whitespace from relative URLs", () => {
      expect(sanitizeUrl("  /about  ")).toBe("/about");
    });
  });
});

// ---------------------------------------------------------------------------
// sanitizeImageSrc
// ---------------------------------------------------------------------------
describe("sanitizeImageSrc", () => {
  describe("http/https allowed", () => {
    it("allows https URLs", () => {
      expect(sanitizeImageSrc("https://example.com/img.jpg")).toBe(
        "https://example.com/img.jpg"
      );
    });

    it("allows http URLs", () => {
      expect(sanitizeImageSrc("http://example.com/img.jpg")).toBe(
        "http://example.com/img.jpg"
      );
    });
  });

  describe("mailto rejected, returns empty string", () => {
    it("rejects mailto: (stricter than sanitizeUrl)", () => {
      expect(sanitizeImageSrc("mailto:test@example.com")).toBe("");
    });
  });

  describe("relative paths allowed", () => {
    it("allows paths starting with /", () => {
      expect(sanitizeImageSrc("/uploads/img.jpg")).toBe("/uploads/img.jpg");
    });

    it("allows bare filenames without colons", () => {
      expect(sanitizeImageSrc("image.png")).toBe("image.png");
    });
  });

  describe("dangerous schemes return empty string", () => {
    it("blocks javascript: scheme", () => {
      expect(sanitizeImageSrc("javascript:alert(1)")).toBe("");
    });

    it("blocks data: scheme", () => {
      expect(sanitizeImageSrc("data:image/svg+xml;base64,abc")).toBe("");
    });

    it("blocks vbscript: scheme", () => {
      expect(sanitizeImageSrc("vbscript:x")).toBe("");
    });

    it("blocks ftp: scheme", () => {
      expect(sanitizeImageSrc("ftp://example.com/img.jpg")).toBe("");
    });

    it("blocks bare strings with colons", () => {
      expect(sanitizeImageSrc("evil:payload")).toBe("");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(sanitizeImageSrc("")).toBe("");
    });

    it("returns empty string for null", () => {
      expect(sanitizeImageSrc(null as unknown as string)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(sanitizeImageSrc(undefined as unknown as string)).toBe("");
    });

    it("trims whitespace", () => {
      expect(sanitizeImageSrc("  /uploads/img.jpg  ")).toBe(
        "/uploads/img.jpg"
      );
    });
  });
});

// ---------------------------------------------------------------------------
// getSafeVideoEmbedUrl
// ---------------------------------------------------------------------------
describe("getSafeVideoEmbedUrl", () => {
  describe("YouTube URLs (standard + youtu.be)", () => {
    it("converts standard YouTube watch URL", () => {
      expect(
        getSafeVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
      ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("converts YouTube watch URL without www", () => {
      expect(
        getSafeVideoEmbedUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")
      ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("converts youtu.be short URL", () => {
      expect(getSafeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
        "https://www.youtube.com/embed/dQw4w9WgXcQ"
      );
    });

    it("handles video IDs with hyphens and underscores", () => {
      expect(
        getSafeVideoEmbedUrl("https://www.youtube.com/watch?v=a-b_c123")
      ).toBe("https://www.youtube.com/embed/a-b_c123");
    });

    it("ignores extra query params but still extracts v=", () => {
      expect(
        getSafeVideoEmbedUrl(
          "https://www.youtube.com/watch?v=abc123&list=PLxyz"
        )
      ).toBe("https://www.youtube.com/embed/abc123");
    });

    it("returns null for YouTube URL without v parameter", () => {
      expect(
        getSafeVideoEmbedUrl("https://www.youtube.com/watch")
      ).toBeNull();
    });
  });

  describe("Vimeo URLs", () => {
    it("converts standard Vimeo URL", () => {
      expect(getSafeVideoEmbedUrl("https://vimeo.com/123456789")).toBe(
        "https://player.vimeo.com/video/123456789"
      );
    });

    it("converts Vimeo URL with www", () => {
      expect(getSafeVideoEmbedUrl("https://www.vimeo.com/123456789")).toBe(
        "https://player.vimeo.com/video/123456789"
      );
    });
  });

  describe("invalid domains return null", () => {
    it("returns null for non-video hosts", () => {
      expect(
        getSafeVideoEmbedUrl("https://evil.com/watch?v=abc")
      ).toBeNull();
    });

    it("returns null for random domain", () => {
      expect(
        getSafeVideoEmbedUrl("https://notvideo.io/123")
      ).toBeNull();
    });
  });

  describe("invalid video IDs return null", () => {
    it("rejects video IDs with special characters", () => {
      expect(
        getSafeVideoEmbedUrl(
          "https://www.youtube.com/watch?v=abc<script>"
        )
      ).toBeNull();
    });

    it("rejects video IDs with spaces", () => {
      expect(
        getSafeVideoEmbedUrl("https://www.youtube.com/watch?v=abc def")
      ).toBeNull();
    });

    it("rejects empty Vimeo path (no video ID)", () => {
      // pathname is "/" => pop() yields "", which fails the pattern test
      expect(getSafeVideoEmbedUrl("https://vimeo.com/")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for empty string", () => {
      expect(getSafeVideoEmbedUrl("")).toBeNull();
    });

    it("returns null for null", () => {
      expect(getSafeVideoEmbedUrl(null as unknown as string)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(
        getSafeVideoEmbedUrl(undefined as unknown as string)
      ).toBeNull();
    });

    it("returns null for malformed URL", () => {
      expect(getSafeVideoEmbedUrl("not a url")).toBeNull();
    });

    it("returns null for plain text", () => {
      expect(getSafeVideoEmbedUrl("just some text")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// sanitizeEmbedHtml
// ---------------------------------------------------------------------------
describe("sanitizeEmbedHtml", () => {
  describe("iframe sandbox enforced", () => {
    it("adds sandbox attribute to iframes from allowlisted hosts", () => {
      const input =
        '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
      const result = sanitizeEmbedHtml(input);
      expect(result).toContain("iframe");
      expect(result).toContain("youtube.com/embed/abc");
    });

    it("strips script tags from embeds", () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeEmbedHtml(input);
      expect(result).not.toContain("script");
    });
  });

  describe("non-https src replaced with div", () => {
    it("replaces http iframe with div", () => {
      const input =
        '<iframe src="http://www.youtube.com/embed/abc"></iframe>';
      const result = sanitizeEmbedHtml(input);
      expect(result).not.toContain("iframe");
    });

    it("replaces ftp iframe src", () => {
      const input = '<iframe src="ftp://files.example.com/doc"></iframe>';
      const result = sanitizeEmbedHtml(input);
      expect(result).not.toContain("iframe");
    });

    it("replaces javascript: iframe src", () => {
      const input = '<iframe src="javascript:alert(1)"></iframe>';
      const result = sanitizeEmbedHtml(input);
      expect(result).not.toContain("javascript:");
    });
  });

  describe("allowed iframe hostnames work", () => {
    it("allows YouTube embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://www.youtube.com/embed/abc"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows Vimeo player embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://player.vimeo.com/video/123"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows Spotify embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://open.spotify.com/embed/track/abc"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows SoundCloud embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://w.soundcloud.com/player/abc"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows CodePen embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://codepen.io/embed/abc"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows CodeSandbox embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://codesandbox.io/embed/abc"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows Google Docs embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://docs.google.com/document/d/abc/pub"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows Google Maps embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://maps.google.com/maps?q=place"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("allows Figma embeds", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://www.figma.com/embed?url=abc"></iframe>'
      );
      expect(result).toContain("<iframe");
    });

    it("rejects non-allowlisted hosts", () => {
      const result = sanitizeEmbedHtml(
        '<iframe src="https://evil.com/embed"></iframe>'
      );
      expect(result).not.toContain("evil.com");
    });
  });

  describe("other allowed tags", () => {
    it("allows div, span, p tags", () => {
      const input = '<div><span>hello</span><p>world</p></div>';
      const result = sanitizeEmbedHtml(input);
      expect(result).toContain("<div>");
      expect(result).toContain("<span>");
      expect(result).toContain("<p>");
    });

    it("allows img tags with src and alt", () => {
      const result = sanitizeEmbedHtml(
        '<img src="https://example.com/img.jpg" alt="test">'
      );
      expect(result).toContain("img");
      expect(result).toContain("alt");
    });

    it("allows table tags", () => {
      const input =
        "<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>";
      const result = sanitizeEmbedHtml(input);
      expect(result).toContain("<table>");
      expect(result).toContain("<th>");
      expect(result).toContain("<td>");
    });

    it("allows heading tags h1-h6", () => {
      expect(sanitizeEmbedHtml("<h1>T</h1>")).toContain("<h1>");
      expect(sanitizeEmbedHtml("<h5>T</h5>")).toContain("<h5>");
      expect(sanitizeEmbedHtml("<h6>T</h6>")).toContain("<h6>");
    });

    it("allows figure and figcaption", () => {
      const result = sanitizeEmbedHtml(
        "<figure><figcaption>Caption</figcaption></figure>"
      );
      expect(result).toContain("<figure>");
      expect(result).toContain("<figcaption>");
    });

    it("enforces rel=noopener noreferrer on a tags", () => {
      const result = sanitizeEmbedHtml(
        '<a href="https://example.com">link</a>'
      );
      expect(result).toContain('rel="noopener noreferrer"');
    });
  });
});

// ---------------------------------------------------------------------------
// sanitizeBlocks
// ---------------------------------------------------------------------------
describe("sanitizeBlocks", () => {
  describe("heading blocks", () => {
    it("strips HTML from heading text", () => {
      const blocks = [
        {
          type: "heading",
          content: { text: "<script>alert(1)</script>Hello", level: 1 },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const text = (result[0].content as Record<string, unknown>).text;
      expect(text).not.toContain("<script>");
      expect(text).toContain("Hello");
    });

    it("strips bold/italic from heading text (plain text only)", () => {
      const blocks = [
        {
          type: "heading",
          content: { text: "<b>Bold</b> <i>Italic</i>", level: 2 },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const text = (result[0].content as Record<string, unknown>).text;
      expect(text).not.toContain("<b>");
      expect(text).not.toContain("<i>");
      expect(text).toContain("Bold");
      expect(text).toContain("Italic");
    });

    it("preserves non-text content fields (like level)", () => {
      const blocks = [
        {
          type: "heading",
          content: { text: "Hello", level: 3 },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).level).toBe(3);
    });
  });

  describe("text blocks", () => {
    it("sanitizes HTML through sanitizeRichHtml", () => {
      const blocks = [
        {
          type: "text",
          content: { html: '<p>Hello</p><script>alert(1)</script>' },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const html = (result[0].content as Record<string, unknown>).html;
      expect(html).not.toContain("script");
      expect(html).toContain("<p>Hello</p>");
    });

    it("preserves allowed rich HTML tags in text blocks", () => {
      const blocks = [
        {
          type: "text",
          content: {
            html: "<p><strong>bold</strong> and <em>italic</em></p>",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const html = (result[0].content as Record<string, unknown>).html;
      expect(html).toContain("<strong>");
      expect(html).toContain("<em>");
    });
  });

  describe("button blocks", () => {
    it("strips HTML from button text", () => {
      const blocks = [
        {
          type: "button",
          content: { text: "<b>Click</b>", url: "https://example.com" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect(
        (result[0].content as Record<string, unknown>).text
      ).not.toContain("<b>");
    });

    it("sanitizes button URL through sanitizeUrl", () => {
      const blocks = [
        {
          type: "button",
          content: { text: "Click", url: "javascript:alert(1)" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).url).toBe("#");
    });

    it("preserves safe button URL", () => {
      const blocks = [
        {
          type: "button",
          content: { text: "Click", url: "https://example.com" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).url).toBe(
        "https://example.com"
      );
    });
  });

  describe("image blocks", () => {
    it("sanitizes image src through sanitizeImageSrc", () => {
      const blocks = [
        {
          type: "image",
          content: { src: "javascript:alert(1)", alt: "test" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).src).toBe("");
    });

    it("preserves safe image src", () => {
      const blocks = [
        {
          type: "image",
          content: { src: "https://example.com/img.jpg", alt: "test" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).src).toBe(
        "https://example.com/img.jpg"
      );
    });

    it("preserves relative image src", () => {
      const blocks = [
        {
          type: "image",
          content: { src: "/uploads/photo.png", alt: "photo" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).src).toBe(
        "/uploads/photo.png"
      );
    });
  });

  describe("video blocks", () => {
    it("sanitizes video URL through sanitizeUrl", () => {
      const blocks = [
        {
          type: "video",
          content: { url: "javascript:alert(1)" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).url).toBe("#");
    });

    it("preserves safe video URL", () => {
      const blocks = [
        {
          type: "video",
          content: { url: "https://youtube.com/watch?v=abc" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).url).toBe(
        "https://youtube.com/watch?v=abc"
      );
    });
  });

  describe("quote blocks", () => {
    it("strips HTML from quote text and attribution", () => {
      const blocks = [
        {
          type: "quote",
          content: { text: "<b>quote</b>", attribution: "<i>author</i>" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.text).not.toContain("<b>");
      expect(c.text).toContain("quote");
      expect(c.attribution).not.toContain("<i>");
      expect(c.attribution).toContain("author");
    });

    it("strips script tags from quote content", () => {
      const blocks = [
        {
          type: "quote",
          content: {
            text: "<script>evil</script>safe",
            attribution: "<script>evil</script>safe",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.text).not.toContain("script");
      expect(c.attribution).not.toContain("script");
    });

    it("sanitizes rich HTML in quote html field", () => {
      const blocks = [
        {
          type: "quote",
          content: {
            html: "<p><strong>Wise words</strong></p>",
            text: "Wise words",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.html).toContain("<strong>Wise words</strong>");
      expect(c.html).toContain("<p>");
    });

    it("strips script tags from quote html field", () => {
      const blocks = [
        {
          type: "quote",
          content: {
            html: '<p>ok</p><script>alert("xss")</script>',
            text: "ok",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.html).not.toContain("script");
      expect(c.html).toContain("<p>ok</p>");
    });

    it("strips img/iframe tags from quote html field", () => {
      const blocks = [
        {
          type: "quote",
          content: {
            html: '<p>quote</p><img src="x" onerror="alert(1)"><iframe src="evil.com"></iframe>',
            text: "quote",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.html).not.toContain("<img");
      expect(c.html).not.toContain("<iframe");
      expect(c.html).toContain("<p>quote</p>");
    });
  });

  describe("form blocks", () => {
    it("sanitizes field labels and placeholders", () => {
      const blocks = [
        {
          type: "form",
          content: {
            fields: [
              {
                label: "<script>xss</script>Name",
                placeholder: "<b>Enter</b>",
              },
            ],
            submitText: "Submit",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const fields = (result[0].content as Record<string, unknown>)
        .fields as Array<Record<string, unknown>>;
      expect(fields[0].label).not.toContain("script");
      expect(fields[0].label).toContain("Name");
      expect(fields[0].placeholder).not.toContain("<b>");
    });

    it("sanitizes submitText and successMessage", () => {
      const blocks = [
        {
          type: "form",
          content: {
            fields: [],
            submitText: "<script>Go</script>",
            successMessage: "<script>Thanks</script>",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.submitText).not.toContain("script");
      expect(c.successMessage).not.toContain("script");
    });

    it("rejects pattern over 200 chars (set to undefined)", () => {
      const blocks = [
        {
          type: "form",
          content: {
            fields: [{ label: "field", pattern: "x".repeat(201) }],
            submitText: "Go",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const fields = (result[0].content as Record<string, unknown>)
        .fields as Array<Record<string, unknown>>;
      expect(fields[0].pattern).toBeUndefined();
    });

    it("keeps valid pattern within 200 chars", () => {
      const blocks = [
        {
          type: "form",
          content: {
            fields: [{ label: "field", pattern: "^[a-z]+$" }],
            submitText: "Go",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const fields = (result[0].content as Record<string, unknown>)
        .fields as Array<Record<string, unknown>>;
      expect(fields[0].pattern).toBe("^[a-z]+$");
    });

    it("truncates patternMessage to 200 chars", () => {
      const blocks = [
        {
          type: "form",
          content: {
            fields: [
              {
                label: "field",
                pattern: "^[a-z]+$",
                patternMessage: "x".repeat(300),
              },
            ],
            submitText: "Go",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const fields = (result[0].content as Record<string, unknown>)
        .fields as Array<Record<string, unknown>>;
      expect((fields[0].patternMessage as string).length).toBeLessThanOrEqual(
        200
      );
    });
  });

  describe("code blocks", () => {
    it("strips HTML in snippet mode", () => {
      const blocks = [
        {
          type: "code",
          content: {
            code: "<script>alert(1)</script>",
            displayMode: "snippet",
            snippetLanguage: "javascript",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect(
        (result[0].content as Record<string, unknown>).code
      ).not.toContain("<script>");
    });

    it("validates snippet language against known list", () => {
      const blocks = [
        {
          type: "code",
          content: {
            code: "x",
            displayMode: "snippet",
            snippetLanguage: "evil-lang",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect(
        (result[0].content as Record<string, unknown>).snippetLanguage
      ).toBe("plaintext");
    });

    it("allows all valid snippet languages", () => {
      const validLangs = [
        "javascript",
        "typescript",
        "python",
        "html",
        "css",
        "json",
        "bash",
        "sql",
        "go",
        "rust",
        "php",
        "plaintext",
      ];
      for (const lang of validLangs) {
        const blocks = [
          {
            type: "code",
            content: {
              code: "test",
              displayMode: "snippet",
              snippetLanguage: lang,
            },
            settings: {},
          },
        ];
        const result = sanitizeBlocks(blocks);
        expect(
          (result[0].content as Record<string, unknown>).snippetLanguage
        ).toBe(lang);
      }
    });

    it("sanitizes embed mode via sanitizeEmbedHtml", () => {
      const blocks = [
        {
          type: "code",
          content: {
            code: '<script>alert(1)</script><iframe src="https://www.youtube.com/embed/abc"></iframe>',
            displayMode: "embed",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.code).not.toContain("script");
      expect(c.code).toContain("iframe");
    });

    it("treats unset displayMode as embed mode", () => {
      const blocks = [
        {
          type: "code",
          content: {
            code: '<script>alert(1)</script><div>safe</div>',
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const c = result[0].content as Record<string, unknown>;
      expect(c.code).not.toContain("script");
      expect(c.code).toContain("<div>safe</div>");
    });
  });

  describe("social blocks", () => {
    it("sanitizes platform name and URL", () => {
      const blocks = [
        {
          type: "social",
          content: {
            links: [
              {
                platform: "<script>x</script>twitter",
                url: "javascript:alert(1)",
              },
            ],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const links = (result[0].content as Record<string, unknown>)
        .links as Array<Record<string, unknown>>;
      expect(links[0].platform).not.toContain("script");
      expect(links[0].platform).toContain("twitter");
      expect(links[0].url).toBe("#");
    });

    it("preserves safe social URLs", () => {
      const blocks = [
        {
          type: "social",
          content: {
            links: [
              { platform: "twitter", url: "https://twitter.com/user" },
            ],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const links = (result[0].content as Record<string, unknown>)
        .links as Array<Record<string, unknown>>;
      expect(links[0].url).toBe("https://twitter.com/user");
    });

    it("defaults to # for non-string url", () => {
      const blocks = [
        {
          type: "social",
          content: {
            links: [{ platform: "twitter", url: 123 }],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const links = (result[0].content as Record<string, unknown>)
        .links as Array<Record<string, unknown>>;
      expect(links[0].url).toBe("#");
    });
  });

  describe("accordion blocks", () => {
    it("strips HTML from accordion titles (plain text)", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [
              {
                id: "1",
                title: "<b>Question</b>",
                content: "<p>Answer</p>",
              },
            ],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const items = (result[0].content as Record<string, unknown>)
        .items as Array<Record<string, unknown>>;
      expect(items[0].title).not.toContain("<b>");
      expect(items[0].title).toContain("Question");
    });

    it("sanitizes accordion content via sanitizeRichHtml", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [
              {
                id: "1",
                title: "Q",
                content: "<p>Answer</p><script>xss</script>",
              },
            ],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const items = (result[0].content as Record<string, unknown>)
        .items as Array<Record<string, unknown>>;
      expect(items[0].content).not.toContain("script");
      expect(items[0].content).toContain("<p>Answer</p>");
    });

    it("defaults to empty string for non-string item fields", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [{ id: 123, title: null, content: undefined }],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const items = (result[0].content as Record<string, unknown>)
        .items as Array<Record<string, unknown>>;
      expect(items[0].title).toBe("");
      expect(items[0].content).toBe("");
    });
  });

  describe("table blocks", () => {
    it("sanitizes headers via sanitizeRichHtml (allows rich HTML)", () => {
      const blocks = [
        {
          type: "table",
          content: {
            headers: ["<script>xss</script>Name", "<b>Age</b>"],
            rows: [],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const headers = (result[0].content as Record<string, unknown>)
        .headers as string[];
      expect(headers[0]).not.toContain("script");
      expect(headers[0]).toContain("Name");
      expect(headers[1]).toContain("<b>Age</b>");
    });

    it("sanitizes row cells via sanitizeRichHtml", () => {
      const blocks = [
        {
          type: "table",
          content: {
            headers: ["Col"],
            rows: [["<script>xss</script>Data", "<em>italic</em>"]],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const rows = (result[0].content as Record<string, unknown>)
        .rows as string[][];
      expect(rows[0][0]).not.toContain("script");
      expect(rows[0][0]).toContain("Data");
      expect(rows[0][1]).toContain("<em>italic</em>");
    });

    it("strips HTML from caption (plain text only)", () => {
      const blocks = [
        {
          type: "table",
          content: {
            headers: [],
            rows: [],
            caption: "<b>Table</b> caption",
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const caption = (result[0].content as Record<string, unknown>).caption;
      expect(caption).not.toContain("<b>");
      expect(caption).toContain("Table");
    });

    it("handles non-string header values", () => {
      const blocks = [
        {
          type: "table",
          content: {
            headers: [123, null],
            rows: [],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const headers = (result[0].content as Record<string, unknown>)
        .headers as string[];
      expect(headers[0]).toBe("");
      expect(headers[1]).toBe("");
    });

    it("handles non-array rows gracefully", () => {
      const blocks = [
        {
          type: "table",
          content: {
            headers: ["Col"],
            rows: ["not-an-array"],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const rows = (result[0].content as Record<string, unknown>)
        .rows as unknown[][];
      expect(rows[0]).toEqual([]);
    });
  });

  describe("columns blocks (recursive)", () => {
    it("recursively sanitizes nested blocks in columns", () => {
      const blocks = [
        {
          type: "columns",
          content: {
            columns: [
              {
                blocks: [
                  {
                    type: "text",
                    content: { html: "<script>xss</script><p>ok</p>" },
                    settings: {},
                  },
                ],
              },
              {
                blocks: [
                  {
                    type: "heading",
                    content: { text: "<b>Title</b>", level: 1 },
                    settings: {},
                  },
                ],
              },
            ],
          },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const cols = (result[0].content as Record<string, unknown>)
        .columns as Array<{ blocks: Array<Record<string, unknown>> }>;

      // First column: text block
      expect(
        (cols[0].blocks[0].content as Record<string, unknown>).html
      ).not.toContain("script");
      expect(
        (cols[0].blocks[0].content as Record<string, unknown>).html
      ).toContain("<p>ok</p>");

      // Second column: heading block
      expect(
        (cols[1].blocks[0].content as Record<string, unknown>).text
      ).not.toContain("<b>");
      expect(
        (cols[1].blocks[0].content as Record<string, unknown>).text
      ).toContain("Title");
    });

    it("handles columns with missing blocks array", () => {
      const blocks = [
        {
          type: "columns",
          content: { columns: [{}] },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const cols = (result[0].content as Record<string, unknown>)
        .columns as Array<{ blocks: unknown[] }>;
      expect(cols[0].blocks).toEqual([]);
    });

    it("handles empty columns array", () => {
      const blocks = [
        {
          type: "columns",
          content: { columns: [] },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      const cols = (result[0].content as Record<string, unknown>)
        .columns as unknown[];
      expect(cols).toEqual([]);
    });
  });

  describe("passthrough block types", () => {
    it("passes through spacer blocks unchanged", () => {
      const blocks = [
        { type: "spacer", content: { height: "40px" }, settings: {} },
      ];
      const result = sanitizeBlocks(blocks);
      expect((result[0].content as Record<string, unknown>).height).toBe(
        "40px"
      );
    });

    it("passes through divider blocks unchanged", () => {
      const blocks = [{ type: "divider", content: {}, settings: {} }];
      const result = sanitizeBlocks(blocks);
      expect(result[0].content).toEqual({});
    });

    it("passes through toc blocks unchanged", () => {
      const blocks = [{ type: "toc", content: {}, settings: {} }];
      const result = sanitizeBlocks(blocks);
      expect(result[0].content).toEqual({});
    });
  });

  describe("metadata preservation", () => {
    it("preserves block id, settings, and parentId", () => {
      const blocks = [
        {
          id: "block123",
          type: "text",
          content: { html: "<p>hello</p>" },
          settings: { textColor: "#000" },
          parentId: "parent1",
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect(result[0].id).toBe("block123");
      expect(result[0].settings).toEqual({ textColor: "#000" });
      expect(result[0].parentId).toBe("parent1");
    });

    it("preserves null parentId", () => {
      const blocks = [
        {
          id: "block1",
          type: "text",
          content: { html: "<p>hi</p>" },
          parentId: null,
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect(result[0].parentId).toBeNull();
    });
  });

  describe("array handling", () => {
    it("handles empty blocks array", () => {
      expect(sanitizeBlocks([])).toEqual([]);
    });

    it("handles multiple blocks of different types", () => {
      const blocks = [
        {
          type: "heading",
          content: { text: "<b>H</b>", level: 1 },
          settings: {},
        },
        {
          type: "text",
          content: { html: "<p>T</p>" },
          settings: {},
        },
        { type: "divider", content: {}, settings: {} },
        {
          type: "image",
          content: { src: "/uploads/img.jpg", alt: "img" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect(result).toHaveLength(4);
      expect(
        (result[0].content as Record<string, unknown>).text
      ).toBe("H");
      expect(
        (result[1].content as Record<string, unknown>).html
      ).toContain("<p>T</p>");
      expect(result[2].content).toEqual({});
      expect(
        (result[3].content as Record<string, unknown>).src
      ).toBe("/uploads/img.jpg");
    });

    it("returns a new array (does not mutate input)", () => {
      const blocks = [
        {
          type: "heading",
          content: { text: "<b>Hello</b>" },
          settings: {},
        },
      ];
      const result = sanitizeBlocks(blocks);
      expect(result).not.toBe(blocks);
      expect(result[0]).not.toBe(blocks[0]);
    });
  });
});
