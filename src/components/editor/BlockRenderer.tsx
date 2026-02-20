"use client";

import type { EditorBlock, HeadingContent, TextContent, ImageContent, ButtonContent, SpacerContent, DividerContent, ColumnsContent, VideoContent, QuoteContent, FormContent, CodeContent, SocialContent, AccordionContent, TocContent, TableContent } from "@/types/blocks";
import { ErrorBoundary, BlockErrorFallback } from "@/components/ErrorBoundary";
import { useEditorStore } from "@/stores/editor-store";
import {
  HeadingBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  SpacerBlock,
  DividerBlock,
  ColumnsBlock,
  VideoBlock,
  QuoteBlock,
  FormBlock,
  CodeBlock,
  SocialBlock,
  AccordionBlock,
  TocBlock,
  TableBlock,
} from "./blocks";

interface BlockRendererProps {
  block: EditorBlock;
}

function BlockContent({ block }: BlockRendererProps) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock id={block.id} content={block.content as HeadingContent} settings={block.settings} />;
    case "text":
      return <TextBlock id={block.id} content={block.content as TextContent} settings={block.settings} />;
    case "image":
      return <ImageBlock id={block.id} content={block.content as ImageContent} settings={block.settings} />;
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
    case "quote":
      return <QuoteBlock id={block.id} content={block.content as QuoteContent} settings={block.settings} />;
    case "form":
      return <FormBlock id={block.id} content={block.content as FormContent} />;
    case "code":
      return <CodeBlock id={block.id} content={block.content as CodeContent} settings={block.settings} />;
    case "social":
      return <SocialBlock id={block.id} content={block.content as SocialContent} settings={block.settings} />;
    case "accordion":
      return <AccordionBlock id={block.id} content={block.content as AccordionContent} settings={block.settings} />;
    case "toc":
      return <TocBlock id={block.id} content={block.content as TocContent} settings={block.settings} />;
    case "table":
      return <TableBlock id={block.id} content={block.content as TableContent} settings={block.settings} />;
    default:
      return <div>Unknown block type: {block.type}</div>;
  }
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const removeBlock = useEditorStore((s) => s.removeBlock);

  return (
    <ErrorBoundary
      resetKey={JSON.stringify(block.content)}
      fallback={<BlockErrorFallback onDelete={() => removeBlock(block.id)} />}
    >
      <BlockContent block={block} />
    </ErrorBoundary>
  );
}
