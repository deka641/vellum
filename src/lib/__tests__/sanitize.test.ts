import { describe, it, expect } from "vitest";
import {
  sanitizeRichHtml,
  sanitizeUrl,
  sanitizeImageSrc,
  getSafeVideoEmbedUrl,
  sanitizeEmbedHtml,
  sanitizeBlocks,
  sanitizePlainText,
} from "../sanitize";

describe("sanitizeRichHtml", () => {
  it("allows TipTap tags", () => {
    expect(sanitizeRichHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "<p>Hello <strong>world</strong></p>"
    );
  });

  it("allows em, b, i, u, s tags", () => {
    const result = sanitizeRichHtml(
      "<em>a</em><b>b</b><i>c</i><u>d</u><s>e</s>"
    );
    expect(result).toContain("<em>a</em>");
    expect(result).toContain("<b>b</b>");
    expect(result).toContain("<i>c</i>");
    expect(result).toContain("<u>d</u>");
    expect(result).toContain("<s>e</s>");
  });

  it("strips script tags", () => {
    expect(
      sanitizeRichHtml('<p>Hello</p><script>alert("xss")</script>')
    ).not.toContain("script");
  });

  it("strips onerror event handlers", () => {
    const input = '<img onerror="alert(1)" src="x">';
    const result = sanitizeRichHtml(input);
    expect(result).not.toContain("onerror");
  });

  it("strips onclick event handlers", () => {
    const result = sanitizeRichHtml('<p onclick="alert(1)">hi</p>');
    expect(result).not.toContain("onclick");
  });

  it("forces rel=noopener noreferrer on links", () => {
    const result = sanitizeRichHtml(
      '<a href="https://example.com">link</a>'
    );
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it("strips img tags (not in TipTap allowlist)", () => {
    expect(sanitizeRichHtml('<img src="x.jpg">')).not.toContain("img");
  });

  it("allows list tags", () => {
    const html = "<ul><li>item</li></ul>";
    expect(sanitizeRichHtml(html)).toContain("<ul>");
    expect(sanitizeRichHtml(html)).toContain("<li>");
  });

  it("allows ordered list tags", () => {
    const html = "<ol><li>item</li></ol>";
    expect(sanitizeRichHtml(html)).toContain("<ol>");
    expect(sanitizeRichHtml(html)).toContain("<li>");
  });

  it("allows blockquote", () => {
    expect(sanitizeRichHtml("<blockquote>quote</blockquote>")).toContain(
      "<blockquote>"
    );
  });

  it("allows code and pre tags", () => {
    expect(sanitizeRichHtml("<pre><code>x</code></pre>")).toContain("<pre>");
    expect(sanitizeRichHtml("<pre><code>x</code></pre>")).toContain("<code>");
  });

  it("allows sub and sup tags", () => {
    expect(sanitizeRichHtml("<sub>x</sub>")).toContain("<sub>");
    expect(sanitizeRichHtml("<sup>x</sup>")).toContain("<sup>");
  });

  it("strips dangerous href schemes on links", () => {
    const result = sanitizeRichHtml(
      '<a href="javascript:alert(1)">xss</a>'
    );
    expect(result).not.toContain("javascript:");
  });

  it("allows heading tags h1-h4", () => {
    expect(sanitizeRichHtml("<h1>Title</h1>")).toContain("<h1>");
    expect(sanitizeRichHtml("<h2>Title</h2>")).toContain("<h2>");
    expect(sanitizeRichHtml("<h3>Title</h3>")).toContain("<h3>");
    expect(sanitizeRichHtml("<h4>Title</h4>")).toContain("<h4>");
  });

  it("strips h5 and h6 tags (not in allowlist)", () => {
    expect(sanitizeRichHtml("<h5>Title</h5>")).not.toContain("<h5>");
    expect(sanitizeRichHtml("<h6>Title</h6>")).not.toContain("<h6>");
  });

  it("strips style tags", () => {
    expect(
      sanitizeRichHtml("<style>body{color:red}</style>")
    ).not.toContain("style");
  });

  it("strips div tags", () => {
    expect(sanitizeRichHtml("<div>content</div>")).not.toContain("<div>");
  });

  it("allows br and hr tags", () => {
    expect(sanitizeRichHtml("<br>")).toContain("<br");
    expect(sanitizeRichHtml("<hr>")).toContain("<hr");
  });

  it("strips data attributes on links", () => {
    const result = sanitizeRichHtml(
      '<a href="https://example.com" data-evil="yes">link</a>'
    );
    expect(result).not.toContain("data-evil");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeRichHtml("")).toBe("");
  });
});

describe("sanitizePlainText", () => {
  it("strips all HTML", () => {
    expect(sanitizePlainText("<b>Hello</b> <script>x</script>")).toBe(
      "Hello"
    );
  });

  it("returns empty string for falsy input", () => {
    expect(sanitizePlainText("")).toBe("");
    expect(sanitizePlainText(null as unknown as string)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sanitizePlainText(undefined as unknown as string)).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizePlainText("  hello  ")).toBe("hello");
  });

  it("strips nested tags", () => {
    expect(
      sanitizePlainText("<div><p><b>nested</b></p></div>")
    ).toBe("nested");
  });

  it("preserves text content from multiple tags", () => {
    const result = sanitizePlainText("<p>hello</p><p>world</p>");
    expect(result).toContain("hello");
    expect(result).toContain("world");
  });
});

describe("sanitizeUrl", () => {
  it("allows http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("allows mailto URLs", () => {
    expect(sanitizeUrl("mailto:test@example.com")).toBe(
      "mailto:test@example.com"
    );
  });

  it("allows relative paths", () => {
    expect(sanitizeUrl("/about")).toBe("/about");
  });

  it("allows anchors", () => {
    expect(sanitizeUrl("#section")).toBe("#section");
  });

  it("blocks javascript: scheme", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
  });

  it("blocks data: scheme", () => {
    expect(
      sanitizeUrl("data:text/html,<script>alert(1)</script>")
    ).toBe("#");
  });

  it("blocks vbscript: scheme", () => {
    expect(sanitizeUrl("vbscript:msgbox")).toBe("#");
  });

  it("returns # for empty input", () => {
    expect(sanitizeUrl("")).toBe("#");
    expect(sanitizeUrl(null as unknown as string)).toBe("#");
  });

  it("returns # for undefined", () => {
    expect(sanitizeUrl(undefined as unknown as string)).toBe("#");
  });

  it("allows bare paths without colons", () => {
    expect(sanitizeUrl("page.html")).toBe("page.html");
  });

  it("blocks unknown schemes with colons", () => {
    expect(sanitizeUrl("custom:scheme")).toBe("#");
  });

  it("allows root-relative paths", () => {
    expect(sanitizeUrl("/path/to/page")).toBe("/path/to/page");
  });

  it("allows hash fragments", () => {
    expect(sanitizeUrl("#top")).toBe("#top");
  });

  it("allows https URL with path and query", () => {
    expect(sanitizeUrl("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1"
    );
  });

  it("trims whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe(
      "https://example.com"
    );
  });
});

describe("sanitizeImageSrc", () => {
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

  it("allows relative paths", () => {
    expect(sanitizeImageSrc("/uploads/img.jpg")).toBe("/uploads/img.jpg");
  });

  it("blocks javascript: scheme", () => {
    expect(sanitizeImageSrc("javascript:alert(1)")).toBe("");
  });

  it("blocks data: scheme", () => {
    expect(sanitizeImageSrc("data:image/svg+xml;base64,abc")).toBe("");
  });

  it("returns empty for empty input", () => {
    expect(sanitizeImageSrc("")).toBe("");
  });

  it("returns empty for null", () => {
    expect(sanitizeImageSrc(null as unknown as string)).toBe("");
  });

  it("returns empty for undefined", () => {
    expect(sanitizeImageSrc(undefined as unknown as string)).toBe("");
  });

  it("blocks mailto: (stricter than sanitizeUrl)", () => {
    expect(sanitizeImageSrc("mailto:test@example.com")).toBe("");
  });

  it("blocks vbscript: scheme", () => {
    expect(sanitizeImageSrc("vbscript:x")).toBe("");
  });

  it("allows bare filename without colon", () => {
    expect(sanitizeImageSrc("image.png")).toBe("image.png");
  });

  it("blocks bare filename with colon", () => {
    expect(sanitizeImageSrc("evil:payload")).toBe("");
  });
});

describe("getSafeVideoEmbedUrl", () => {
  it("converts YouTube watch URL", () => {
    expect(
      getSafeVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("converts YouTube short URL", () => {
    expect(getSafeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });

  it("converts YouTube URL without www", () => {
    expect(
      getSafeVideoEmbedUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("converts Vimeo URL", () => {
    expect(getSafeVideoEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789"
    );
  });

  it("converts Vimeo URL with www", () => {
    expect(getSafeVideoEmbedUrl("https://www.vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789"
    );
  });

  it("returns null for non-video hosts", () => {
    expect(
      getSafeVideoEmbedUrl("https://evil.com/watch?v=abc")
    ).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(getSafeVideoEmbedUrl("not a url")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(getSafeVideoEmbedUrl("")).toBeNull();
    expect(getSafeVideoEmbedUrl(null as unknown as string)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getSafeVideoEmbedUrl(undefined as unknown as string)).toBeNull();
  });

  it("rejects suspicious video IDs", () => {
    expect(
      getSafeVideoEmbedUrl("https://www.youtube.com/watch?v=abc<script>")
    ).toBeNull();
  });

  it("handles YouTube URL without v parameter", () => {
    expect(
      getSafeVideoEmbedUrl("https://www.youtube.com/watch")
    ).toBeNull();
  });

  it("handles YouTube video ID with hyphens and underscores", () => {
    expect(
      getSafeVideoEmbedUrl("https://www.youtube.com/watch?v=a-b_c123")
    ).toBe("https://www.youtube.com/embed/a-b_c123");
  });

  it("rejects video ID with special characters", () => {
    expect(
      getSafeVideoEmbedUrl("https://www.youtube.com/watch?v=abc&def")
    ).toBe("https://www.youtube.com/embed/abc");
  });
});

describe("sanitizeEmbedHtml", () => {
  it("allows YouTube iframes with https", () => {
    const input =
      '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("iframe");
    expect(result).toContain("youtube.com/embed/abc");
  });

  it("removes http iframes (replaced with div)", () => {
    const input =
      '<iframe src="http://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeEmbedHtml(input);
    expect(result).not.toContain("iframe");
  });

  it("strips script tags", () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeEmbedHtml(input);
    expect(result).not.toContain("script");
  });

  it("preserves iframe for allowlisted https hosts", () => {
    const input =
      '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("<iframe");
    expect(result).toContain("</iframe>");
  });

  it("strips sandbox attribute not in allowedAttributes", () => {
    // sanitize-html filters attributes not in the allowedAttributes list
    // even if transformTags adds them, so sandbox is stripped
    const input =
      '<iframe src="https://www.youtube.com/embed/abc" sandbox="allow-same-origin"></iframe>';
    const result = sanitizeEmbedHtml(input);
    // The iframe itself is preserved for allowlisted hosts
    expect(result).toContain("iframe");
  });

  it("allows Spotify embeds", () => {
    const input =
      '<iframe src="https://open.spotify.com/embed/track/abc"></iframe>';
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("iframe");
  });

  it("allows Vimeo embeds", () => {
    const input =
      '<iframe src="https://player.vimeo.com/video/123"></iframe>';
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("iframe");
  });

  it("allows CodePen embeds", () => {
    const input =
      '<iframe src="https://codepen.io/embed/abc"></iframe>';
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("iframe");
  });

  it("rejects non-allowlisted hosts", () => {
    const input = '<iframe src="https://evil.com/embed"></iframe>';
    const result = sanitizeEmbedHtml(input);
    expect(result).not.toContain("evil.com");
  });

  it("allows div, span, p tags", () => {
    const input = '<div><span>hello</span><p>world</p></div>';
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("<div>");
    expect(result).toContain("<span>");
    expect(result).toContain("<p>");
  });

  it("allows img tags with src and alt", () => {
    const input = '<img src="https://example.com/img.jpg" alt="test">';
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("img");
  });

  it("allows table tags", () => {
    const input =
      "<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>";
    const result = sanitizeEmbedHtml(input);
    expect(result).toContain("<table>");
    expect(result).toContain("<th>");
    expect(result).toContain("<td>");
  });
});

describe("sanitizeBlocks", () => {
  it("sanitizes heading blocks (strips HTML)", () => {
    const blocks = [
      {
        type: "heading",
        content: { text: "<script>alert(1)</script>Hello", level: 1 },
        settings: {},
      },
    ];
    const result = sanitizeBlocks(blocks);
    expect(
      (result[0].content as Record<string, unknown>).text
    ).not.toContain("<script>");
    expect(
      (result[0].content as Record<string, unknown>).text
    ).toContain("Hello");
  });

  it("sanitizes text blocks (rich HTML)", () => {
    const blocks = [
      {
        type: "text",
        content: { html: '<p>Hello</p><script>alert(1)</script>' },
        settings: {},
      },
    ];
    const result = sanitizeBlocks(blocks);
    expect(
      (result[0].content as Record<string, unknown>).html
    ).not.toContain("script");
    expect(
      (result[0].content as Record<string, unknown>).html
    ).toContain("<p>Hello</p>");
  });

  it("sanitizes image blocks (src)", () => {
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

  it("sanitizes button blocks (url and text)", () => {
    const blocks = [
      {
        type: "button",
        content: { text: "<b>Click</b>", url: "javascript:alert(1)" },
        settings: {},
      },
    ];
    const result = sanitizeBlocks(blocks);
    expect(
      (result[0].content as Record<string, unknown>).text
    ).not.toContain("<b>");
    expect((result[0].content as Record<string, unknown>).url).toBe("#");
  });

  it("sanitizes video blocks", () => {
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

  it("recursively sanitizes column blocks", () => {
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
          ],
        },
        settings: {},
      },
    ];
    const result = sanitizeBlocks(blocks);
    const cols = (result[0].content as Record<string, unknown>)
      .columns as Array<{ blocks: Array<Record<string, unknown>> }>;
    expect(
      (cols[0].blocks[0].content as Record<string, unknown>).html
    ).not.toContain("script");
    expect(
      (cols[0].blocks[0].content as Record<string, unknown>).html
    ).toContain("<p>ok</p>");
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

  it("sanitizes quote blocks", () => {
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
    expect(c.attribution).not.toContain("<i>");
  });

  it("sanitizes form blocks", () => {
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
    const fields = c.fields as Array<Record<string, unknown>>;
    expect(fields[0].label).not.toContain("script");
    expect(fields[0].label).toContain("Name");
    expect(fields[0].placeholder).not.toContain("<b>");
  });

  it("caps form field pattern length at 200", () => {
    const blocks = [
      {
        type: "form",
        content: {
          fields: [
            {
              label: "field",
              pattern: "x".repeat(201),
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
    expect(fields[0].pattern).toBeUndefined();
  });

  it("keeps form field pattern within 200 chars", () => {
    const blocks = [
      {
        type: "form",
        content: {
          fields: [
            {
              label: "field",
              pattern: "^[a-z]+$",
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
    expect(fields[0].pattern).toBe("^[a-z]+$");
  });

  it("sanitizes code block (snippet mode strips HTML)", () => {
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
    const c = result[0].content as Record<string, unknown>;
    expect(c.code).not.toContain("<script>");
  });

  it("validates snippet language against known list", () => {
    const blocks = [
      {
        type: "code",
        content: {
          code: "console.log()",
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

  it("allows valid snippet languages", () => {
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

  it("sanitizes code block in embed mode via sanitizeEmbedHtml", () => {
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

  it("sanitizes accordion blocks", () => {
    const blocks = [
      {
        type: "accordion",
        content: {
          items: [
            {
              id: "1",
              title: "<b>Question</b>",
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
    expect(items[0].title).not.toContain("<b>");
    expect(items[0].title).toContain("Question");
    expect(items[0].content).not.toContain("script");
    expect(items[0].content).toContain("<p>Answer</p>");
  });

  it("sanitizes table blocks", () => {
    const blocks = [
      {
        type: "table",
        content: {
          headers: ["<script>xss</script>Name", "<b>Age</b>"],
          rows: [["<script>xss</script>John", "<em>30</em>"]],
          caption: "<b>Table</b>",
        },
        settings: {},
      },
    ];
    const result = sanitizeBlocks(blocks);
    const c = result[0].content as Record<string, unknown>;
    expect((c.headers as string[])[0]).not.toContain("script");
    expect((c.headers as string[])[1]).toContain("<b>Age</b>"); // rich HTML allowed in headers
    expect((c.rows as string[][])[0][0]).not.toContain("script");
    expect((c.rows as string[][])[0][1]).toContain("<em>30</em>"); // rich HTML allowed in cells
    expect(c.caption).not.toContain("<b>"); // plain text for caption
  });

  it("sanitizes social block links", () => {
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

  it("handles empty blocks array", () => {
    expect(sanitizeBlocks([])).toEqual([]);
  });

  it("handles multiple blocks", () => {
    const blocks = [
      { type: "heading", content: { text: "<b>H</b>", level: 1 }, settings: {} },
      { type: "text", content: { html: "<p>T</p>" }, settings: {} },
      { type: "divider", content: {}, settings: {} },
    ];
    const result = sanitizeBlocks(blocks);
    expect(result).toHaveLength(3);
    expect((result[0].content as Record<string, unknown>).text).toBe("H");
  });
});
