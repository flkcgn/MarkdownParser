export interface ParseResult {
  json: any;
  stats: {
    elements: number;
    jsonSize: string;
    processTime: string;
  };
  metadata: {
    word_count: number;
    reading_time: number;
    tags: string[];
    wikilinks: string[];
    created_at: string;
    updated_at: string;
  };
}

export function countWords(markdown: string): number {
  let text = markdown.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`]*`/g, " ");
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/[*_~]/g, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/[\n\r\t]+/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

function parseInlineElements(text: string): any[] {
  const elements: any[] = [];
  const strongRegex = /\*\*(.*?)\*\*/g;
  const emRegex = /\*(.*?)\*/g;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  const matches: Array<{ type: string; content: string; url?: string; start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  strongRegex.lastIndex = 0;
  while ((match = strongRegex.exec(text)) !== null) {
    matches.push({ type: 'strong', content: match[1], start: match.index, end: match.index + match[0].length });
  }
  emRegex.lastIndex = 0;
  while ((match = emRegex.exec(text)) !== null) {
    if (!matches.some(m => match!.index >= m.start && match!.index < m.end)) {
      matches.push({ type: 'emphasis', content: match[1], start: match.index, end: match.index + match[0].length });
    }
  }
  linkRegex.lastIndex = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    matches.push({ type: 'link', content: match[1], url: match[2], start: match.index, end: match.index + match[0].length });
  }
  codeRegex.lastIndex = 0;
  while ((match = codeRegex.exec(text)) !== null) {
    matches.push({ type: 'code', content: match[1], start: match.index, end: match.index + match[0].length });
  }
  matches.sort((a, b) => a.start - b.start);
  matches.forEach(match => {
    if (match.start > lastIndex) {
      const textContent = text.slice(lastIndex, match.start);
      if (textContent.trim()) {
        elements.push({ type: 'text', content: textContent });
      }
    }
    if (match.type === 'link') {
      elements.push({ type: 'link', content: match.content, url: match.url });
    } else {
      elements.push({ type: match.type, content: match.content });
    }
    lastIndex = match.end;
  });
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      elements.push({ type: 'text', content: remaining });
    }
  }
  if (elements.length === 0 && text.trim()) {
    return [{ type: 'text', content: text.replace(/<[^>]*>/g, '') }];
  }
  return elements;
}

export function parseMarkdownToStructuredJson(markdown: string): ParseResult {
  const startTime = Date.now();
  let tags: string[] = [];
  let wikilinks: string[] = [];
  let createdAt = new Date();
  let updatedAt = new Date();
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const fmLines = fm.split(/\n+/);
    for (const line of fmLines) {
      const [rawKey, ...rest] = line.split(":");
      if (!rawKey || rest.length === 0) continue;
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === 'tags') {
        if (value.startsWith('[') && value.endsWith(']')) {
          tags.push(
            ...value
              .slice(1, -1)
              .split(/[,\s]+/)
              .map((t) => t.replace(/^["'\-\s]+|["'\s]+$/g, ''))
              .filter(Boolean)
          );
        } else {
          tags.push(
            ...value
              .split(/[,\s]+/)
              .map((t) => t.replace(/^["'\-\s]+|["'\s]+$/g, ''))
              .filter(Boolean)
          );
        }
      } else if (key === 'created' || key === 'created_at') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) createdAt = d;
      } else if (key === 'updated' || key === 'updated_at') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) updatedAt = d;
      }
    }
    markdown = markdown.slice(fmMatch[0].length).trimStart();
  }
  const tagRegex = /(^|\s)#([A-Za-z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(markdown)) !== null) {
    tags.push(m[2]);
  }
  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  while ((m = wikiRegex.exec(markdown)) !== null) {
    wikilinks.push(m[1].trim());
  }
  tags = Array.from(new Set(tags));
  wikilinks = Array.from(new Set(wikilinks));
  const elements: any[] = [];
  let elementCount = 0;
  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      elements.push({ type: 'heading', level: headerMatch[1].length, content: headerMatch[2] });
      elementCount++;
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const langMatch = line.match(/^```(\w+)?/);
      const language = langMatch?.[1] || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push({ type: 'code_block', language, content: codeLines.join('\n') });
      elementCount++;
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const content = line.substring(1).trim();
      elements.push({ type: 'blockquote', content });
      elementCount++;
      i++;
      continue;
    }
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push({ type: 'horizontal_rule' });
      elementCount++;
      i++;
      continue;
    }
    const unorderedListMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (unorderedListMatch) {
      const items: any[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        const listMatch = currentLine.match(/^[\s]*[-*+]\s+(.+)$/);
        if (listMatch) {
          items.push({ type: 'list_item', content: listMatch[1] });
          i++;
        } else if (currentLine === '') {
          i++;
        } else {
          break;
        }
      }
      elements.push({ type: 'list', ordered: false, items });
      elementCount++;
      continue;
    }
    const orderedListMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (orderedListMatch) {
      const items: any[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        const listMatch = currentLine.match(/^[\s]*\d+\.\s+(.+)$/);
        if (listMatch) {
          items.push({ type: 'list_item', content: listMatch[1] });
          i++;
        } else if (currentLine === '') {
          i++;
        } else {
          break;
        }
      }
      elements.push({ type: 'list', ordered: true, items });
      elementCount++;
      continue;
    }
    const children = parseInlineElements(line);
    if (children.length === 1 && children[0].type === 'text') {
      elements.push({ type: 'paragraph', content: children[0].content });
    } else {
      elements.push({ type: 'paragraph', children });
    }
    elementCount++;
    i++;
  }
  const endTime = Date.now();
  const processTime = ((endTime - startTime) / 1000).toFixed(3) + 's';
  const result = { type: 'document', children: elements };
  const jsonString = JSON.stringify(result, null, 2);
  const jsonSize = (jsonString.length / 1024).toFixed(1) + ' KB';
  const wordCount = countWords(markdown);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  return {
    json: result,
    stats: { elements: elementCount, jsonSize, processTime },
    metadata: {
      word_count: wordCount,
      reading_time: readingTime,
      tags,
      wikilinks,
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
    },
  };
}
