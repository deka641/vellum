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
  category: "text" | "media" | "layout" | "interactive";
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
    defaultContent: { columns: [{ blocks: [] }, { blocks: [] }], columnWidths: [50, 50] },
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
  quote: {
    type: "quote",
    label: "Quote",
    icon: "Quote",
    category: "text",
    defaultContent: { text: "", attribution: "", style: "default" },
    defaultSettings: { align: "left" },
  },
  form: {
    type: "form",
    label: "Form",
    icon: "FileInput",
    category: "layout",
    defaultContent: {
      fields: [
        { id: "name", type: "text", label: "Name", required: true, placeholder: "Your name" },
        { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
        { id: "message", type: "textarea", label: "Message", required: false, placeholder: "Your message..." },
      ],
      submitText: "Submit",
      successMessage: "Thank you! Your message has been sent.",
    },
    defaultSettings: {},
  },
  code: {
    type: "code",
    label: "Code / Embed",
    icon: "Code",
    category: "media",
    defaultContent: { code: "", language: "html" },
    defaultSettings: {},
  },
  social: {
    type: "social",
    label: "Social Links",
    icon: "Share2",
    category: "text",
    defaultContent: { links: [], style: "icons" },
    defaultSettings: { align: "center" },
  },
  accordion: {
    type: "accordion",
    label: "Accordion",
    icon: "ChevronDown",
    category: "interactive",
    defaultContent: {
      items: [
        { id: generateId(), title: "Accordion item 1", content: "<p>Content for item 1</p>" },
        { id: generateId(), title: "Accordion item 2", content: "<p>Content for item 2</p>" },
        { id: generateId(), title: "Accordion item 3", content: "<p>Content for item 3</p>" },
      ],
      style: "bordered",
      iconPosition: "right",
    },
    defaultSettings: {},
  },
  toc: {
    type: "toc",
    label: "Table of Contents",
    icon: "List",
    category: "interactive",
    defaultContent: { maxDepth: 3, style: "boxed", ordered: false },
    defaultSettings: {},
  },
  table: {
    type: "table",
    label: "Table",
    icon: "Table",
    category: "layout",
    defaultContent: {
      headers: ["Column 1", "Column 2", "Column 3"],
      rows: [["", "", ""], ["", "", ""]],
      caption: "",
      striped: true,
    },
    defaultSettings: {},
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
  { key: "interactive", label: "Interactive" },
] as const;
