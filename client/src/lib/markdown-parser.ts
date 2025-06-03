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

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  suggestion?: string;
}

export function validateMarkdown(markdown: string): {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const lines = markdown.split('\n');

  // Check for unclosed code blocks
  const codeBlocks = markdown.match(/```/g);
  if (codeBlocks && codeBlocks.length % 2 !== 0) {
    errors.push({
      type: 'error',
      message: 'Unclosed code block detected',
      suggestion: 'Add closing ``` to complete the code block'
    });
  }

  // Check for malformed links
  lines.forEach((line, index) => {
    const malformedLinks = line.match(/\[[^\]]*\]\([^)]*$/);
    if (malformedLinks) {
      errors.push({
        type: 'error',
        message: 'Malformed link detected',
        line: index + 1,
        suggestion: 'Ensure link syntax is [text](url) with closing parenthesis'
      });
    }

    // Check for unbalanced brackets in links
    const linkBrackets = line.match(/\[[^\]]*$/);
    if (linkBrackets) {
      errors.push({
        type: 'error',
        message: 'Unclosed link bracket',
        line: index + 1,
        suggestion: 'Add closing ] bracket'
      });
    }
  });

  // Check for excessive header nesting
  lines.forEach((line, index) => {
    const headerMatch = line.match(/^(#{7,})\s/);
    if (headerMatch) {
      errors.push({
        type: 'error',
        message: 'Header nesting too deep (max 6 levels)',
        line: index + 1,
        suggestion: `Use ${headerMatch[1].slice(0, 6)} instead of ${headerMatch[1]}`
      });
    }

    // Check for headers without space
    const headerNoSpace = line.match(/^#{1,6}[^#\s]/);
    if (headerNoSpace) {
      warnings.push({
        type: 'warning',
        message: 'Header should have space after #',
        line: index + 1,
        suggestion: 'Add space after # symbols'
      });
    }
  });

  // Check for empty headers
  lines.forEach((line, index) => {
    const emptyHeader = line.match(/^#{1,6}\s*$/);
    if (emptyHeader) {
      warnings.push({
        type: 'warning',
        message: 'Empty header detected',
        line: index + 1,
        suggestion: 'Add text content after the header'
      });
    }
  });

  // Check for inconsistent list markers
  const listLines = lines.filter((line, index) => {
    const isListItem = line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/);
    return isListItem;
  });

  if (listLines.length > 1) {
    const unorderedMarkers = new Set();
    listLines.forEach(line => {
      const marker = line.match(/^\s*([-*+])\s/);
      if (marker) {
        unorderedMarkers.add(marker[1]);
      }
    });

    if (unorderedMarkers.size > 1) {
      warnings.push({
        type: 'warning',
        message: 'Inconsistent list markers',
        suggestion: 'Use consistent markers (-, *, or +) for unordered lists'
      });
    }
  }

  // Check for missing alt text in images
  lines.forEach((line, index) => {
    const imageNoAlt = line.match(/!\[\]\([^)]+\)/g);
    if (imageNoAlt) {
      warnings.push({
        type: 'warning',
        message: 'Image missing alt text',
        line: index + 1,
        suggestion: 'Add descriptive alt text: ![description](url)'
      });
    }
  });

  // Check for trailing spaces
  lines.forEach((line, index) => {
    if (line.endsWith(' ') && line.trim() !== '') {
      warnings.push({
        type: 'warning',
        message: 'Trailing whitespace',
        line: index + 1,
        suggestion: 'Remove trailing spaces'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
