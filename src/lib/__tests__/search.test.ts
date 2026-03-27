import { describe, it, expect } from "vitest";
import { extractTextFromBlocks, getSnippet, highlightSnippet, rankSearchResults } from "../search";

describe("extractTextFromBlocks", () => {
  it("extracts text from heading blocks", () => {
    const blocks = [{ content: { text: "Hello World" }, type: "heading" }];
    expect(extractTextFromBlocks(blocks)).toBe("Hello World");
  });

  it("extracts text from text blocks (strips HTML)", () => {
    const blocks = [{ content: { html: "<p>Hello <strong>world</strong></p>" }, type: "text" }];
    const result = extractTextFromBlocks(blocks);
    expect(result).toContain("Hello");
    expect(result).toContain("world");
    expect(result).not.toContain("<p>");
  });

  it("extracts attribution from quote blocks", () => {
    const blocks = [{ content: { text: "Quote text", attribution: "Author" }, type: "quote" }];
    expect(extractTextFromBlocks(blocks)).toContain("Author");
  });

  it("extracts text from accordion items", () => {
    const blocks = [{
      content: {
        items: [
          { title: "FAQ Question", content: "<p>FAQ Answer</p>" }
        ]
      },
      type: "accordion"
    }];
    const result = extractTextFromBlocks(blocks);
    expect(result).toContain("FAQ Question");
    expect(result).toContain("FAQ Answer");
  });

  it("extracts text from column children recursively", () => {
    const blocks = [{
      content: {
        columns: [
          { blocks: [{ content: { text: "Column Text" }, type: "heading" }] },
        ]
      },
      type: "columns"
    }];
    expect(extractTextFromBlocks(blocks)).toContain("Column Text");
  });

  it("extracts text from table headers and rows", () => {
    const blocks = [{
      content: {
        headers: ["<b>Name</b>", "Age"],
        rows: [["<em>John</em>", "30"], ["Jane", "25"]],
      },
      type: "table"
    }];
    const result = extractTextFromBlocks(blocks);
    expect(result).toContain("Name");
    expect(result).toContain("Age");
    expect(result).toContain("John");
    expect(result).toContain("30");
    expect(result).not.toContain("<b>");
  });

  it("respects maxChars limit", () => {
    const blocks = [
      { content: { text: "A".repeat(5000) }, type: "heading" },
      { content: { text: "B".repeat(5000) }, type: "heading" },
      { content: { text: "C".repeat(5000) }, type: "heading" },
    ];
    const result = extractTextFromBlocks(blocks, 10000);
    // Should stop after reaching maxChars
    expect(result.length).toBeLessThan(15000);
  });

  it("handles empty blocks array", () => {
    expect(extractTextFromBlocks([])).toBe("");
  });

  it("handles blocks with no content", () => {
    const blocks = [{ type: "divider" } as Record<string, unknown>];
    expect(extractTextFromBlocks(blocks)).toBe("");
  });
});

describe("getSnippet", () => {
  it("returns text centered on query match", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const snippet = getSnippet(text, "fox");
    expect(snippet).toContain("fox");
  });

  it("adds ellipsis when truncated", () => {
    const text = "A".repeat(200) + "QUERY" + "B".repeat(200);
    const snippet = getSnippet(text, "QUERY");
    expect(snippet.startsWith("...")).toBe(true);
    expect(snippet.endsWith("...")).toBe(true);
  });

  it("returns start of text when no match", () => {
    const text = "Hello world this is some text";
    const snippet = getSnippet(text, "nomatch");
    expect(snippet).toBe(text.slice(0, 160));
  });

  it("respects maxLen parameter", () => {
    const text = "A".repeat(500);
    const snippet = getSnippet(text, "nomatch", 100);
    expect(snippet.length).toBeLessThanOrEqual(100);
  });
});

describe("highlightSnippet", () => {
  it("wraps matching text with <mark> tags", () => {
    const result = highlightSnippet("Hello world", "world");
    expect(result).toBe("Hello <mark>world</mark>");
  });

  it("is case-insensitive", () => {
    const result = highlightSnippet("Hello World", "world");
    expect(result).toBe("Hello <mark>World</mark>");
  });

  it("highlights multiple occurrences", () => {
    const result = highlightSnippet("cat and cat", "cat");
    expect(result).toBe("<mark>cat</mark> and <mark>cat</mark>");
  });

  it("escapes HTML in text before highlighting (XSS prevention)", () => {
    const result = highlightSnippet('<script>alert("xss")</script> hello world', "world");
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
    expect(result).toContain("<mark>world</mark>");
  });

  it("escapes HTML entities in the query too", () => {
    const result = highlightSnippet("Use a <div> tag here", "<div>");
    expect(result).toContain("<mark>&lt;div&gt;</mark>");
    expect(result).not.toContain("<mark><div></mark>");
  });

  it("returns escaped text when query is empty", () => {
    const result = highlightSnippet("Hello <b>world</b>", "");
    expect(result).toBe("Hello &lt;b&gt;world&lt;/b&gt;");
  });

  it("handles regex special characters in query safely", () => {
    const result = highlightSnippet("price is $10.00 now", "$10.00");
    expect(result).toContain("<mark>$10.00</mark>");
  });

  it("handles query with no matches gracefully", () => {
    const result = highlightSnippet("Hello world", "xyz");
    expect(result).toBe("Hello world");
  });

  it("preserves original case in matched text", () => {
    const result = highlightSnippet("TypeScript is great", "typescript");
    expect(result).toBe("<mark>TypeScript</mark> is great");
  });

  it("handles ampersands in text", () => {
    const result = highlightSnippet("Salt & Pepper", "salt");
    expect(result).toBe("<mark>Salt</mark> &amp; Pepper");
  });

  it("handles quotes in text", () => {
    const result = highlightSnippet('She said "hello"', "hello");
    expect(result).toContain("&quot;");
    expect(result).toContain("<mark>hello</mark>");
  });
});

describe("rankSearchResults", () => {
  it("sorts title matches first, then description, then content", () => {
    const results = [
      { matchType: "content", snippet: "c" },
      { matchType: "title", snippet: "a" },
      { matchType: "description", snippet: "b" },
      { matchType: "content", snippet: "d" },
      { matchType: "title", snippet: "e" },
    ];

    const ranked = rankSearchResults(results);
    expect(ranked.map((r) => r.matchType)).toEqual([
      "title", "title", "description", "content", "content",
    ]);
  });

  it("preserves order within the same matchType group", () => {
    const results = [
      { matchType: "content", snippet: "first" },
      { matchType: "content", snippet: "second" },
      { matchType: "content", snippet: "third" },
    ];

    const ranked = rankSearchResults(results);
    expect(ranked.map((r) => r.snippet)).toEqual(["first", "second", "third"]);
  });

  it("does not mutate the original array", () => {
    const results = [
      { matchType: "content", snippet: "c" },
      { matchType: "title", snippet: "a" },
    ];
    const original = [...results];
    rankSearchResults(results);
    expect(results).toEqual(original);
  });

  it("handles empty array", () => {
    expect(rankSearchResults([])).toEqual([]);
  });

  it("handles unknown matchType with lowest priority", () => {
    const results = [
      { matchType: "title", snippet: "a" },
      { matchType: "unknown", snippet: "z" },
      { matchType: "content", snippet: "c" },
    ];

    const ranked = rankSearchResults(results);
    expect(ranked.map((r) => r.matchType)).toEqual(["title", "content", "unknown"]);
  });
});
