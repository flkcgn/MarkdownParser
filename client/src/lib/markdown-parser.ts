// Client-side utility functions for markdown parsing
// This is mainly used for preview and client-side validation

export interface MarkdownElement {
  type: string;
  content?: string;
  level?: number;
  children?: MarkdownElement[];
  url?: string;
  language?: string;
  ordered?: boolean;
  items?: MarkdownElement[];
}

export function parseMarkdownPreview(markdown: string): string {
  // Simple client-side markdown to HTML conversion for preview
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Code
  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-primary hover:underline">$1</a>');

  // Line breaks
  html = html.replace(/\n/gim, '<br>');

  return html;
}

export function getMarkdownStats(markdown: string): {
  characters: number;
  words: number;
  lines: number;
  elements: number;
} {
  const characters = markdown.length;
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const lines = markdown.split('\n').length;
  
  // Count markdown elements
  const headers = (markdown.match(/^#+\s/gm) || []).length;
  const lists = (markdown.match(/^[\s]*[-*+]\s/gm) || []).length;
  const orderedLists = (markdown.match(/^[\s]*\d+\.\s/gm) || []).length;
  const links = (markdown.match(/\[.*?\]\(.*?\)/g) || []).length;
  const codeBlocks = (markdown.match(/```[\s\S]*?```/g) || []).length;
  const inlineCode = (markdown.match(/`[^`]+`/g) || []).length;
  const blockquotes = (markdown.match(/^>\s/gm) || []).length;
  
  const elements = headers + lists + orderedLists + links + codeBlocks + inlineCode + blockquotes;

  return {
    characters,
    words,
    lines,
    elements,
  };
}

export function validateMarkdown(markdown: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unclosed code blocks
  const codeBlocks = markdown.match(/```/g);
  if (codeBlocks && codeBlocks.length % 2 !== 0) {
    errors.push("Unclosed code block detected");
  }

  // Check for malformed links
  const malformedLinks = markdown.match(/\[[^\]]*\]\([^)]*$/gm);
  if (malformedLinks && malformedLinks.length > 0) {
    errors.push("Malformed link detected");
  }

  // Check for excessive nesting (more than 6 header levels)
  const headers = markdown.match(/^#{7,}\s/gm);
  if (headers && headers.length > 0) {
    errors.push("Header nesting too deep (max 6 levels)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
