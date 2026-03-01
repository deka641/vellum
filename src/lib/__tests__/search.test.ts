import { describe, it, expect } from "vitest";
import { extractTextFromBlocks, getSnippet } from "../search";

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
