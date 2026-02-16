import {
  type BlockType,
  type EditorBlock,
  type BlockContent,
  type BlockSettings,
} from "@/types/blocks";
import { generateId } from "./utils";

interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  category: "text" | "media" | "layout";
  defaultContent: BlockContent;
  defaultSettings: BlockSettings;
}

export const blockDefinitions: Record<BlockType, BlockDefinition> = {
  heading: {
    type: "heading",
    label: "Heading",
    icon: "Type",
    category: "text",
    defaultContent: { text: "Untitled heading", level: 2 },
    defaultSettings: { align: "left" },
  },
  text: {
    type: "text",
    label: "Text",
    icon: "AlignLeft",
    category: "text",
    defaultContent: { html: "<p>Start writing...</p>" },
    defaultSettings: { align: "left" },
  },
  image: {
    type: "image",
    label: "Image",
    icon: "Image",
    category: "media",
    defaultContent: { src: "", alt: "", caption: "" },
    defaultSettings: { width: "100%", rounded: false, shadow: false },
  },
  button: {
    type: "button",
    label: "Button",
    icon: "MousePointer",
    category: "text",
    defaultContent: { text: "Click me", url: "#", variant: "primary" },
    defaultSettings: { align: "left", size: "md" },
  },
  spacer: {
    type: "spacer",
    label: "Spacer",
    icon: "MoveVertical",
    category: "layout",
    defaultContent: { height: 48 },
    defaultSettings: {},
  },
  divider: {
    type: "divider",
    label: "Divider",
    icon: "Minus",
    category: "layout",
    defaultContent: {},
    defaultSettings: { style: "solid", color: "#E7E5E4" },
  },
  columns: {
    type: "columns",
    label: "Columns",
    icon: "Columns",
    category: "layout",
    defaultContent: { columns: [{ blocks: [] }, { blocks: [] }] },
    defaultSettings: { gap: "24px" },
  },
  video: {
    type: "video",
    label: "Video",
    icon: "Play",
    category: "media",
    defaultContent: { url: "", provider: "" },
    defaultSettings: { aspectRatio: "16/9" },
  },
};

export function createBlock(type: BlockType): EditorBlock {
  const def = blockDefinitions[type];
  return {
    id: generateId(),
    type,
    content: structuredClone(def.defaultContent),
    settings: structuredClone(def.defaultSettings),
  };
}

export const blockCategories = [
  { key: "text", label: "Text" },
  { key: "media", label: "Media" },
  { key: "layout", label: "Layout" },
] as const;
