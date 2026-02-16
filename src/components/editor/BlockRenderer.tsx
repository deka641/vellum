"use client";

import type { EditorBlock, HeadingContent, TextContent, ImageContent, ButtonContent, SpacerContent, DividerContent, ColumnsContent, VideoContent } from "@/types/blocks";
import {
  HeadingBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  SpacerBlock,
  DividerBlock,
  ColumnsBlock,
  VideoBlock,
} from "./blocks";

interface BlockRendererProps {
  block: EditorBlock;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock id={block.id} content={block.content as HeadingContent} />;
    case "text":
      return <TextBlock id={block.id} content={block.content as TextContent} />;
    case "image":
      return <ImageBlock id={block.id} content={block.content as ImageContent} />;
    case "button":
      return <ButtonBlock id={block.id} content={block.content as ButtonContent} />;
    case "spacer":
      return <SpacerBlock id={block.id} content={block.content as SpacerContent} />;
    case "divider":
      return <DividerBlock id={block.id} content={block.content as DividerContent} settings={block.settings} />;
    case "columns":
      return <ColumnsBlock id={block.id} content={block.content as ColumnsContent} settings={block.settings} />;
    case "video":
      return <VideoBlock id={block.id} content={block.content as VideoContent} settings={block.settings} />;
    default:
      return <div>Unknown block type: {block.type}</div>;
  }
}
