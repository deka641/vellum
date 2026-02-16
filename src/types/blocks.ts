export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "spacer"
  | "divider"
  | "columns"
  | "video";

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
}

export interface ButtonContent {
  text: string;
  url: string;
  variant: "primary" | "secondary" | "outline";
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
}

export interface VideoContent {
  url: string;
  provider: "youtube" | "vimeo" | "";
}

export type BlockContent =
  | HeadingContent
  | TextContent
  | ImageContent
  | ButtonContent
  | SpacerContent
  | DividerContent
  | ColumnsContent
  | VideoContent;

export interface BlockSettings {
  align?: "left" | "center" | "right";
  color?: string;
  maxWidth?: string;
  width?: string;
  aspectRatio?: string;
  rounded?: boolean;
  shadow?: boolean;
  size?: "sm" | "md" | "lg";
  style?: "solid" | "dashed" | "dotted";
  gap?: string;
  distribution?: string;
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  settings: BlockSettings;
  parentId?: string | null;
}
