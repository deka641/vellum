import { describe, it, expect } from "vitest";
import {
  escapeXml,
  stripHtmlTags,
  extractDescription,
  resolveUrl,
  buildContentHtml,
} from "@/lib/rss-helpers";

// ---------------------------------------------------------------------------
// escapeXml
// ---------------------------------------------------------------------------
describe("escapeXml", () => {
  it("escapes ampersand", () => {
    expect(escapeXml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes less-than", () => {
    expect(escapeXml("a < b")).toBe("a &lt; b");
  });

  it("escapes greater-than", () => {
    expect(escapeXml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes (apostrophe)", () => {
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("escapes all 5 special characters together", () => {
    expect(escapeXml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&apos;y&apos;&gt;&amp;&lt;/a&gt;"
    );
  });

  it("returns plain text unchanged", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeXml("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// stripHtmlTags
// ---------------------------------------------------------------------------
describe("stripHtmlTags", () => {
  it("strips basic tags", () => {
    expect(stripHtmlTags("<p>hello</p>")).toBe("hello");
  });

  it("strips nested tags", () => {
    expect(stripHtmlTags("<div><p><strong>bold</strong> text</p></div>")).toBe(
      "bold text"
    );
  });

  it("returns empty string for empty input", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("trims whitespace", () => {
    expect(stripHtmlTags("  <p>hi</p>  ")).toBe("hi");
  });

  it("handles self-closing tags", () => {
    expect(stripHtmlTags("before<br />after")).toBe("beforeafter");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtmlTags("no tags here")).toBe("no tags here");
  });
});

// ---------------------------------------------------------------------------
// extractDescription
// ---------------------------------------------------------------------------
describe("extractDescription", () => {
  it("extracts text from the first text block", () => {
    const blocks = [
      { type: "heading", content: { text: "Title" } },
      { type: "text", content: { html: "<p>First paragraph content</p>" } },
      { type: "text", content: { html: "<p>Second paragraph</p>" } },
    ];
    expect(extractDescription(blocks)).toBe("First paragraph content");
  });

  it("truncates text exceeding maxLen with ellipsis", () => {
    const longText = "A".repeat(400);
    const blocks = [
      { type: "text", content: { html: `<p>${longText}</p>` } },
    ];
    const result = extractDescription(blocks, 300);
    expect(result).toHaveLength(300);
    expect(result.endsWith("\u2026")).toBe(true);
    expect(result.startsWith("A")).toBe(true);
  });

  it("uses custom maxLen parameter", () => {
    const blocks = [
      { type: "text", content: { html: "<p>Short text here</p>" } },
    ];
    const result = extractDescription(blocks, 10);
    expect(result).toBe("Short tex\u2026");
  });

  it("skips placeholder text 'Start writing...'", () => {
    const blocks = [
      { type: "text", content: { html: "<p>Start writing...</p>" } },
      { type: "text", content: { html: "<p>Real content</p>" } },
    ];
    expect(extractDescription(blocks)).toBe("Real content");
  });

  it("returns empty string when no text blocks exist", () => {
    const blocks = [
      { type: "heading", content: { text: "Only heading" } },
      { type: "image", content: { src: "/img.png" } },
    ];
    expect(extractDescription(blocks)).toBe("");
  });

  it("returns empty string for empty blocks array", () => {
    expect(extractDescription([])).toBe("");
  });

  it("skips text blocks with empty html after stripping", () => {
    const blocks = [
      { type: "text", content: { html: "<p></p>" } },
      { type: "text", content: { html: "<p>Actual text</p>" } },
    ];
    expect(extractDescription(blocks)).toBe("Actual text");
  });

  it("skips text blocks without html content", () => {
    const blocks = [
      { type: "text", content: { text: "plain text only" } },
      { type: "text", content: { html: "<p>Has html</p>" } },
    ];
    expect(extractDescription(blocks)).toBe("Has html");
  });
});

// ---------------------------------------------------------------------------
// resolveUrl
// ---------------------------------------------------------------------------
describe("resolveUrl", () => {
  const baseUrl = "https://example.com";

  it("passes through absolute http URL", () => {
    expect(resolveUrl("http://other.com/page", baseUrl)).toBe(
      "http://other.com/page"
    );
  });

  it("passes through absolute https URL", () => {
    expect(resolveUrl("https://other.com/page", baseUrl)).toBe(
      "https://other.com/page"
    );
  });

  it("prepends baseUrl to slash-relative URL", () => {
    expect(resolveUrl("/uploads/image.png", baseUrl)).toBe(
      "https://example.com/uploads/image.png"
    );
  });

  it("prepends baseUrl with slash to non-slash-relative URL", () => {
    expect(resolveUrl("uploads/image.png", baseUrl)).toBe(
      "https://example.com/uploads/image.png"
    );
  });

  it("returns empty string for empty input", () => {
    expect(resolveUrl("", baseUrl)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildContentHtml
// ---------------------------------------------------------------------------
describe("buildContentHtml", () => {
  const baseUrl = "https://example.com";

  it("returns empty string for empty blocks array", () => {
    expect(buildContentHtml([], baseUrl)).toBe("");
  });

  // --- heading ---
  describe("heading block", () => {
    it("renders heading with html content", () => {
      const blocks = [
        { type: "heading", content: { level: 1, html: "<strong>Title</strong>", text: "Title" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<h1>");
      expect(result).toContain("</h1>");
      expect(result).toContain("Title");
    });

    it("renders heading with plain text fallback", () => {
      const blocks = [
        { type: "heading", content: { level: 3, text: "Plain Title" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe("<h3>Plain Title</h3>");
    });

    it("defaults to h2 when level is not specified", () => {
      const blocks = [
        { type: "heading", content: { text: "Default Level" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<h2>");
    });

    it("escapes special characters in plain text heading", () => {
      const blocks = [
        { type: "heading", content: { level: 2, text: "A & B" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe("<h2>A &amp; B</h2>");
    });
  });

  // --- text ---
  describe("text block", () => {
    it("renders sanitized html", () => {
      const blocks = [
        { type: "text", content: { html: "<p>Hello <strong>world</strong></p>" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("Hello");
      expect(result).toContain("world");
    });

    it("skips placeholder text", () => {
      const blocks = [
        { type: "text", content: { html: "<p>Start writing...</p>" } },
      ];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("skips empty paragraph", () => {
      const blocks = [
        { type: "text", content: { html: "<p></p>" } },
      ];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- image ---
  describe("image block", () => {
    it("renders img tag with resolved URL and alt", () => {
      const blocks = [
        { type: "image", content: { src: "/uploads/photo.jpg", alt: "A photo" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe(
        '<img src="https://example.com/uploads/photo.jpg" alt="A photo" />'
      );
    });

    it("defaults alt to empty string", () => {
      const blocks = [
        { type: "image", content: { src: "https://cdn.example.com/img.png" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain('alt=""');
    });

    it("skips image with no src", () => {
      const blocks = [
        { type: "image", content: { src: "", alt: "missing" } },
      ];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- quote ---
  describe("quote block", () => {
    it("renders blockquote with html content", () => {
      const blocks = [
        { type: "quote", content: { html: "<p>Wise words</p>", text: "Wise words" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<blockquote>");
      expect(result).toContain("Wise words");
      expect(result).toContain("</blockquote>");
    });

    it("renders blockquote with plain text fallback", () => {
      const blocks = [
        { type: "quote", content: { text: "Simple quote" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe("<blockquote><p>Simple quote</p></blockquote>");
    });

    it("escapes special characters in plain text quote", () => {
      const blocks = [
        { type: "quote", content: { text: "A & B <>" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe(
        "<blockquote><p>A &amp; B &lt;&gt;</p></blockquote>"
      );
    });
  });

  // --- divider ---
  describe("divider block", () => {
    it("renders hr tag", () => {
      const blocks = [{ type: "divider", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("<hr />");
    });
  });

  // --- button ---
  describe("button block", () => {
    it("renders link with text and resolved URL", () => {
      const blocks = [
        { type: "button", content: { text: "Click me", url: "/about" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe(
        '<p><a href="https://example.com/about">Click me</a></p>'
      );
    });

    it("escapes special characters in button text and URL", () => {
      const blocks = [
        {
          type: "button",
          content: { text: "A & B", url: "https://example.com/?a=1&b=2" },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("A &amp; B");
      expect(result).toContain("a=1&amp;b=2");
    });

    it("skips button with no text", () => {
      const blocks = [
        { type: "button", content: { text: "", url: "/about" } },
      ];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("skips button with no url", () => {
      const blocks = [
        { type: "button", content: { text: "Click", url: "" } },
      ];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- columns ---
  describe("columns block", () => {
    it("renders nested blocks from all columns", () => {
      const blocks = [
        {
          type: "columns",
          content: {
            columns: [
              { blocks: [{ type: "text", content: { html: "<p>Col 1</p>" } }] },
              { blocks: [{ type: "text", content: { html: "<p>Col 2</p>" } }] },
            ],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("Col 1");
      expect(result).toContain("Col 2");
    });

    it("skips empty columns", () => {
      const blocks = [
        {
          type: "columns",
          content: {
            columns: [{ blocks: [] }, { blocks: [] }],
          },
        },
      ];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("handles missing columns content", () => {
      const blocks = [{ type: "columns", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- table ---
  describe("table block", () => {
    it("renders table with header and body rows", () => {
      const blocks = [
        {
          type: "table",
          content: {
            rows: [
              ["Name", "Age"],
              ["Alice", "30"],
              ["Bob", "25"],
            ],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<th>Name</th>");
      expect(result).toContain("<th>Age</th>");
      expect(result).toContain("<tbody>");
      expect(result).toContain("<td>Alice</td>");
      expect(result).toContain("<td>30</td>");
      expect(result).toContain("</table>");
    });

    it("renders table with caption inside the table element", () => {
      const blocks = [
        {
          type: "table",
          content: {
            caption: "My Table",
            rows: [["Col1"], ["Val1"]],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<caption>My Table</caption>");
      // caption must be inside <table>
      const tableStart = result.indexOf("<table>");
      const captionStart = result.indexOf("<caption>");
      const tableEnd = result.indexOf("</table>");
      expect(captionStart).toBeGreaterThan(tableStart);
      expect(captionStart).toBeLessThan(tableEnd);
    });

    it("escapes special characters in caption", () => {
      const blocks = [
        {
          type: "table",
          content: {
            caption: "Sales & Revenue <2024>",
            rows: [["Q1"], ["100"]],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<caption>Sales &amp; Revenue &lt;2024&gt;</caption>");
    });

    it("does not render caption element when caption is absent", () => {
      const blocks = [
        {
          type: "table",
          content: {
            rows: [["Name", "Age"], ["Alice", "30"]],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).not.toContain("<caption>");
      expect(result).toContain("<table>");
    });

    it("renders header-only table (no body rows)", () => {
      const blocks = [
        { type: "table", content: { rows: [["A", "B"]] } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<thead>");
      expect(result).not.toContain("<tbody>");
    });

    it("skips table with no rows", () => {
      const blocks = [{ type: "table", content: { rows: [] } }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("escapes cell content", () => {
      const blocks = [
        { type: "table", content: { rows: [["A & B"]] } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("A &amp; B");
    });

    it("renders rich HTML in table cells", () => {
      const blocks = [
        {
          type: "table",
          content: {
            rows: [
              ["<strong>Header</strong>"],
              ["<em>italic</em> text"],
            ],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<th><strong>Header</strong></th>");
      expect(result).toContain("<td><em>italic</em> text</td>");
    });

    it("strips dangerous tags from table cells", () => {
      const blocks = [
        {
          type: "table",
          content: {
            rows: [["<script>alert(1)</script>safe"]],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).not.toContain("<script>");
      expect(result).toContain("safe");
    });
  });

  // --- code ---
  describe("code block", () => {
    it("renders pre/code with language class", () => {
      const blocks = [
        { type: "code", content: { code: "const x = 1;", language: "javascript" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe(
        '<pre><code class="language-javascript">const x = 1;</code></pre>'
      );
    });

    it("renders pre/code without language", () => {
      const blocks = [
        { type: "code", content: { code: "echo hello" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe("<pre><code>echo hello</code></pre>");
    });

    it("escapes code content", () => {
      const blocks = [
        { type: "code", content: { code: "<div>html</div>" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("&lt;div&gt;html&lt;/div&gt;");
    });

    it("skips code block with no code", () => {
      const blocks = [{ type: "code", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- accordion ---
  describe("accordion block", () => {
    it("renders details/summary elements for each item", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [
              { question: "Q1", answer: "A1" },
              { question: "Q2", answer: "A2" },
            ],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<details>");
      expect(result).toContain("<summary>Q1</summary>");
      expect(result).toContain("A1");
      expect(result).toContain("</details>");
      expect(result).toContain("<summary>Q2</summary>");
      expect(result).toContain("A2");
    });

    it("produces one details element per accordion item", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [
              { question: "Q1", answer: "A1" },
              { question: "Q2", answer: "A2" },
              { question: "Q3", answer: "A3" },
            ],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      const detailsCount = (result.match(/<details>/g) || []).length;
      const summaryCount = (result.match(/<summary>/g) || []).length;
      expect(detailsCount).toBe(3);
      expect(summaryCount).toBe(3);
    });

    it("escapes special characters in questions", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [{ question: "A & B?", answer: "plain text" }],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<summary>A &amp; B?</summary>");
    });

    it("renders rich HTML in accordion answers", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [{ question: "Q1", answer: "<p><strong>Bold</strong> answer</p>" }],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("<summary>Q1</summary>");
      expect(result).toContain("<p><strong>Bold</strong> answer</p>");
      expect(result).toContain("</details>");
    });

    it("strips dangerous tags from accordion answers", () => {
      const blocks = [
        {
          type: "accordion",
          content: {
            items: [{ question: "Q", answer: '<script>alert("xss")</script>safe' }],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).not.toContain("<script>");
      expect(result).toContain("safe");
    });

    it("skips accordion with no items", () => {
      const blocks = [{ type: "accordion", content: { items: [] } }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("skips accordion with missing items", () => {
      const blocks = [{ type: "accordion", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- video ---
  describe("video block", () => {
    it("renders link to video URL", () => {
      const blocks = [
        { type: "video", content: { url: "https://youtube.com/watch?v=abc" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe(
        '<p><a href="https://youtube.com/watch?v=abc">https://youtube.com/watch?v=abc</a></p>'
      );
    });

    it("resolves relative video URL", () => {
      const blocks = [
        { type: "video", content: { url: "/uploads/video.mp4" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("https://example.com/uploads/video.mp4");
    });

    it("skips video with no url", () => {
      const blocks = [{ type: "video", content: { url: "" } }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- social ---
  describe("social block", () => {
    it("renders pipe-separated links", () => {
      const blocks = [
        {
          type: "social",
          content: {
            links: [
              { platform: "Twitter", url: "https://twitter.com/test" },
              { platform: "GitHub", url: "https://github.com/test" },
            ],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe(
        '<p><a href="https://twitter.com/test">Twitter</a> | <a href="https://github.com/test">GitHub</a></p>'
      );
    });

    it("filters out links with empty url", () => {
      const blocks = [
        {
          type: "social",
          content: {
            links: [
              { platform: "Twitter", url: "" },
              { platform: "GitHub", url: "https://github.com/test" },
            ],
          },
        },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toBe(
        '<p><a href="https://github.com/test">GitHub</a></p>'
      );
    });

    it("skips social with no links", () => {
      const blocks = [{ type: "social", content: { links: [] } }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("skips social with missing links", () => {
      const blocks = [{ type: "social", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- omitted block types ---
  describe("omitted block types", () => {
    it("produces no output for spacer", () => {
      const blocks = [{ type: "spacer", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("produces no output for toc", () => {
      const blocks = [{ type: "toc", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });

    it("produces no output for form", () => {
      const blocks = [{ type: "form", content: {} }];
      expect(buildContentHtml(blocks, baseUrl)).toBe("");
    });
  });

  // --- multiple blocks ---
  describe("multiple blocks", () => {
    it("joins block outputs with newlines", () => {
      const blocks = [
        { type: "heading", content: { level: 1, text: "Title" } },
        { type: "divider", content: {} },
        { type: "text", content: { html: "<p>Paragraph</p>" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      const parts = result.split("\n");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("<h1>Title</h1>");
      expect(parts[1]).toBe("<hr />");
    });
  });

  // --- all block types coverage ---
  describe("all block types produce expected output", () => {
    const validBlocks: Array<{ type: string; content: Record<string, unknown>; expectNonEmpty: boolean; label: string }> = [
      { type: "heading", content: { level: 2, text: "Test Heading" }, expectNonEmpty: true, label: "heading" },
      { type: "text", content: { html: "<p>Test paragraph</p>" }, expectNonEmpty: true, label: "text" },
      { type: "image", content: { src: "/test.jpg", alt: "test" }, expectNonEmpty: true, label: "image" },
      { type: "quote", content: { text: "Test quote" }, expectNonEmpty: true, label: "quote" },
      { type: "divider", content: {}, expectNonEmpty: true, label: "divider" },
      { type: "button", content: { text: "Click", url: "/page" }, expectNonEmpty: true, label: "button" },
      { type: "columns", content: { columns: [{ blocks: [{ type: "text", content: { html: "<p>Col</p>" } }] }] }, expectNonEmpty: true, label: "columns" },
      { type: "table", content: { rows: [["H1"], ["V1"]] }, expectNonEmpty: true, label: "table" },
      { type: "code", content: { code: "x = 1", language: "python" }, expectNonEmpty: true, label: "code" },
      { type: "accordion", content: { items: [{ question: "Q", answer: "A" }] }, expectNonEmpty: true, label: "accordion" },
      { type: "video", content: { url: "https://youtube.com/watch?v=abc" }, expectNonEmpty: true, label: "video" },
      { type: "social", content: { links: [{ platform: "Twitter", url: "https://twitter.com/t" }] }, expectNonEmpty: true, label: "social" },
      { type: "spacer", content: {}, expectNonEmpty: false, label: "spacer (omitted)" },
      { type: "toc", content: {}, expectNonEmpty: false, label: "toc (omitted)" },
      { type: "form", content: {}, expectNonEmpty: false, label: "form (omitted)" },
    ];

    for (const { type, content, expectNonEmpty, label } of validBlocks) {
      it(`${label} block returns ${expectNonEmpty ? "non-empty" : "empty"} HTML`, () => {
        const result = buildContentHtml([{ type, content }], baseUrl);
        if (expectNonEmpty) {
          expect(result.length).toBeGreaterThan(0);
        } else {
          expect(result).toBe("");
        }
      });
    }
  });

  // --- hidden blocks ---
  describe("hidden blocks", () => {
    it("skips blocks with hidden setting", () => {
      const blocks = [
        { type: "heading", content: { level: 1, text: "Visible" }, settings: {} },
        { type: "text", content: { html: "<p>Hidden content</p>" }, settings: { hidden: true } },
        { type: "text", content: { html: "<p>Also visible</p>" }, settings: {} },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("Visible");
      expect(result).not.toContain("Hidden content");
      expect(result).toContain("Also visible");
    });

    it("skips hidden blocks without settings object", () => {
      const blocks = [
        { type: "heading", content: { level: 2, text: "Shown" } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("Shown");
    });

    it("includes blocks with hidden: false", () => {
      const blocks = [
        { type: "text", content: { html: "<p>Not hidden</p>" }, settings: { hidden: false } },
      ];
      const result = buildContentHtml(blocks, baseUrl);
      expect(result).toContain("Not hidden");
    });
  });
});

// ---------------------------------------------------------------------------
// extractDescription — hidden block filtering
// ---------------------------------------------------------------------------
describe("extractDescription hidden blocks", () => {
  it("skips hidden text blocks", () => {
    const blocks = [
      { type: "text", content: { html: "<p>Hidden paragraph</p>" }, settings: { hidden: true } },
      { type: "text", content: { html: "<p>Visible paragraph</p>" }, settings: {} },
    ];
    expect(extractDescription(blocks)).toBe("Visible paragraph");
  });

  it("returns empty when all text blocks are hidden", () => {
    const blocks = [
      { type: "text", content: { html: "<p>Secret</p>" }, settings: { hidden: true } },
    ];
    expect(extractDescription(blocks)).toBe("");
  });
});
