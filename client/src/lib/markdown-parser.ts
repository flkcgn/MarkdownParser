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
  // Enhanced client-side markdown to HTML conversion for preview
  let html = markdown;

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

  // Code blocks (must be processed before inline code)
  html = html.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
    return `<pre class="bg-slate-100 p-3 rounded"><code class="text-sm">${code.trim()}</code></pre>`;
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-2">$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr class="border-slate-300 my-4">');

  // Headers (process from h6 to h1 to avoid conflicts)
  html = html.replace(/^###### (.*$)/gim, '<h6 class="text-sm font-medium text-slate-800 mt-4 mb-2">$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5 class="text-base font-medium text-slate-800 mt-4 mb-2">$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg font-medium text-slate-800 mt-4 mb-2">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-slate-800 mt-4 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-slate-800 mt-6 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-slate-800 mt-6 mb-4">$1</h1>');

  // Lists (ordered)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>');
  
  // Lists (unordered)
  html = html.replace(/^[-*+] (.+)$/gm, '<li class="ml-4">$1</li>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>');

  // Bold (process before italic to avoid conflicts)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Line breaks and paragraphs
  html = html.replace(/\n\n/g, '</p><p class="mb-3">');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<') && html.trim()) {
    html = `<p class="mb-3">${html}</p>`;
  }

  // Clean up empty paragraphs and fix paragraph structure
  html = html.replace(/<p class="mb-3"><\/p>/g, '');
  html = html.replace(/<p class="mb-3">(<h[1-6])/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p class="mb-3">(<blockquote|<hr|<pre|<ul|<ol)/g, '$1');
  html = html.replace(/(<\/blockquote>|<\/hr>|<\/pre>|<\/ul>|<\/ol>)<\/p>/g, '$1');

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
  autofix?: {
    oldText: string;
    newText: string;
    startIndex: number;
    endIndex: number;
  };
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
  const fenceLines = lines.filter((line) => line.trim().startsWith('```'));
  if (fenceLines.length % 2 !== 0) {
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
    const headerNoSpace = line.match(/^(#{1,6})([^#\s].*)/);
    if (headerNoSpace) {
      const lineStart = lines.slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
      warnings.push({
        type: 'warning',
        message: 'Header should have space after #',
        line: index + 1,
        suggestion: 'Add space after # symbols',
        autofix: {
          oldText: headerNoSpace[0],
          newText: `${headerNoSpace[1]} ${headerNoSpace[2]}`,
          startIndex: lineStart,
          endIndex: lineStart + headerNoSpace[0].length
        }
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
      imageNoAlt.forEach((match) => {
        const lineStart = lines.slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
        const matchIndex = line.indexOf(match);
        const matchStart = lineStart + matchIndex;
        const url = match.replace(/!\[\]\(([^)]+)\)/, '$1');
        const filename = url.split('/').pop()?.split('.')[0] || 'image';
        
        warnings.push({
          type: 'warning',
          message: 'Image missing alt text',
          line: index + 1,
          suggestion: 'Add descriptive alt text: ![description](url)',
          autofix: {
            oldText: match,
            newText: `![${filename}](${url})`,
            startIndex: matchStart,
            endIndex: matchStart + match.length
          }
        });
      });
    }
  });

  // Check for trailing spaces
  lines.forEach((line, index) => {
    if (line.endsWith(' ') && line.trim() !== '') {
      const lineStart = lines.slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
      const trailingSpaceMatch = line.match(/(\s+)$/);
      if (trailingSpaceMatch) {
        warnings.push({
          type: 'warning',
          message: 'Trailing whitespace',
          line: index + 1,
          suggestion: 'Remove trailing spaces',
          autofix: {
            oldText: line,
            newText: line.trimEnd(),
            startIndex: lineStart,
            endIndex: lineStart + line.length
          }
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function applyAutofix(markdown: string, autofix: ValidationError['autofix']): string {
  if (!autofix) return markdown;
  
  const { oldText, newText, startIndex, endIndex } = autofix;
  return markdown.slice(0, startIndex) + newText + markdown.slice(endIndex);
}

export function applyAllAutofixes(markdown: string, validationErrors: ValidationError[]): string {
  let result = markdown;
  
  // Sort by startIndex in descending order to apply fixes from end to beginning
  // This prevents position shifts from affecting subsequent fixes
  const sortedErrors = validationErrors
    .filter(error => error.autofix)
    .sort((a, b) => (b.autofix!.startIndex) - (a.autofix!.startIndex));
  
  for (const error of sortedErrors) {
    if (error.autofix) {
      result = applyAutofix(result, error.autofix);
    }
  }
  
  return result;
}
