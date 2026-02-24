export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "spacer"
  | "divider"
  | "columns"
  | "video"
  | "quote"
  | "form"
  | "code"
  | "social"
  | "accordion"
  | "toc"
  | "table";

export interface BlockData {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  parentId?: string | null;
}

export interface HeadingContent {
  text: string;
  level: 1 | 2 | 3 | 4;
}

export interface TextContent {
  html: string;
}

export interface ImageContent {
  mediaId?: string;
  src: string;
  alt: string;
  caption?: string;
  link?: string;
  linkNewTab?: boolean;
}

export interface ButtonContent {
  text: string;
  url: string;
  variant: "primary" | "secondary" | "outline";
  openInNewTab?: boolean;
}

export interface SpacerContent {
  height: number;
}

export interface DividerContent {}

export interface ColumnData {
  blocks: EditorBlock[];
}

export interface ColumnsContent {
  columns: ColumnData[];
  columnWidths?: number[];
}

export interface VideoContent {
  url: string;
  provider: "youtube" | "vimeo" | "";
}

export interface QuoteContent {
  text: string;
  attribution?: string;
  style: "default" | "bordered" | "filled";
}

export interface FormField {
  id: string;
  type: "text" | "email" | "textarea" | "select" | "checkbox" | "radio" | "tel" | "number";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface CodeContent {
  code: string;
  language: "html" | "embed";
  displayMode?: "embed" | "snippet";
  snippetLanguage?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface SocialContent {
  links: SocialLink[];
  style: "icons" | "pills";
}

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

export interface AccordionContent {
  items: AccordionItem[];
  style: "bordered" | "minimal";
  iconPosition: "left" | "right";
}

export interface TocContent {
  maxDepth: number;
  style: "minimal" | "boxed";
  ordered: boolean;
}

export interface TableContent {
  headers: string[];
  rows: string[][];
  caption?: string;
  striped: boolean;
}

export interface FormContent {
  fields: FormField[];
  submitText: string;
  successMessage: string;
}

export type BlockContent =
  | HeadingContent
  | TextContent
  | ImageContent
  | ButtonContent
  | SpacerContent
  | DividerContent
  | ColumnsContent
  | VideoContent
  | QuoteContent
  | FormContent
  | CodeContent
  | SocialContent
  | AccordionContent
  | TocContent
  | TableContent;

export interface BlockSettings {
  align?: "left" | "center" | "right";
  color?: string;
  maxWidth?: string;
  width?: string;
  thickness?: string;
  aspectRatio?: string;
  rounded?: boolean;
  shadow?: boolean;
  size?: "sm" | "md" | "lg";
  style?: "solid" | "dashed" | "dotted";
  gap?: string;
  distribution?: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: string;
  paddingY?: string;
  paddingX?: string;
  marginTop?: string;
  marginBottom?: string;
  hidden?: boolean;
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  settings: BlockSettings;
  parentId?: string | null;
}
