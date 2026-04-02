import type { BlockType, BlockData } from "@/types/blocks";

interface Suggestion {
  type: BlockType;
  reason: string;
}

/**
 * Heuristic block suggestions based on the current page content.
 * Returns the top 3 most likely useful next blocks.
 */
export function getBlockSuggestions(blocks: BlockData[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const typeSet = new Set(blocks.map((b) => b.type));
  const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
  const lastType = lastBlock?.type;

  // After heading → suggest text or image
  if (lastType === "heading") {
    suggestions.push({ type: "text", reason: "Add content after heading" });
    suggestions.push({ type: "image", reason: "Add visual after heading" });
  }

  // After text → suggest image, button, or divider
  if (lastType === "text") {
    if (!typeSet.has("image")) {
      suggestions.push({ type: "image", reason: "Break up text with an image" });
    }
    suggestions.push({ type: "button", reason: "Add a call to action" });
    suggestions.push({ type: "divider", reason: "Separate sections" });
  }

  // After image → suggest text or spacer
  if (lastType === "image") {
    suggestions.push({ type: "text", reason: "Describe the image" });
    suggestions.push({ type: "spacer", reason: "Add breathing room" });
  }

  // After columns → suggest heading or text
  if (lastType === "columns") {
    suggestions.push({ type: "heading", reason: "Start a new section" });
    suggestions.push({ type: "text", reason: "Add content after columns" });
  }

  // If page has no heading yet → suggest heading
  if (!typeSet.has("heading") && blocks.length > 0) {
    suggestions.unshift({ type: "heading", reason: "Add a page heading" });
  }

  // If page has no CTA → suggest button at the end
  if (!typeSet.has("button") && blocks.length >= 3) {
    suggestions.push({ type: "button", reason: "Add a call to action" });
  }

  // If page has no form → suggest form for contact
  if (!typeSet.has("form") && blocks.length >= 3) {
    suggestions.push({ type: "form", reason: "Add a contact form" });
  }

  // On empty page → heading first
  if (blocks.length === 0) {
    return [
      { type: "heading", reason: "Start with a heading" },
      { type: "text", reason: "Start with text content" },
      { type: "image", reason: "Start with a hero image" },
    ];
  }

  // Deduplicate by type, keep first occurrence
  const seen = new Set<BlockType>();
  const unique: Suggestion[] = [];
  for (const s of suggestions) {
    if (!seen.has(s.type)) {
      seen.add(s.type);
      unique.push(s);
    }
  }

  return unique.slice(0, 3);
}
