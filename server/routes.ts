import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { convertMarkdownSchema, convertMarkdownResponseSchema } from "@shared/schema";
import { marked } from "marked";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/markdown' || 
        file.mimetype === 'text/plain' || 
        file.originalname.endsWith('.md') || 
        file.originalname.endsWith('.markdown')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .md, .markdown, and .txt files are allowed.'));
    }
  },
});

function parseMarkdownToStructuredJson(markdown: string): any {
  const startTime = Date.now();
  
  const elements: any[] = [];
  let elementCount = 0;

  // Parse using regex patterns for simplicity and reliability
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) {
      i++;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      elements.push({
        type: "heading",
        level: headerMatch[1].length,
        content: headerMatch[2],
      });
      elementCount++;
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      const langMatch = line.match(/^```(\w+)?/);
      const language = langMatch?.[1] || 'text';
      const codeLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      elements.push({
        type: "code_block",
        language: language,
        content: codeLines.join('\n'),
      });
      elementCount++;
      i++; // Skip closing ```
      continue;
    }

    // Blockquotes
    if (line.startsWith('>')) {
      const content = line.substring(1).trim();
      elements.push({
        type: "blockquote",
        content: content,
      });
      elementCount++;
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push({
        type: "horizontal_rule",
      });
      elementCount++;
      i++;
      continue;
    }

    // Lists (unordered)
    const unorderedListMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (unorderedListMatch) {
      const items: any[] = [];
      
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        const listMatch = currentLine.match(/^[\s]*[-*+]\s+(.+)$/);
        if (listMatch) {
          items.push({
            type: "list_item",
            content: listMatch[1],
          });
          i++;
        } else if (currentLine === '') {
          i++;
        } else {
          break;
        }
      }
      
      elements.push({
        type: "list",
        ordered: false,
        items: items,
      });
      elementCount++;
      continue;
    }

    // Lists (ordered)
    const orderedListMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (orderedListMatch) {
      const items: any[] = [];
      
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        const listMatch = currentLine.match(/^[\s]*\d+\.\s+(.+)$/);
        if (listMatch) {
          items.push({
            type: "list_item",
            content: listMatch[1],
          });
          i++;
        } else if (currentLine === '') {
          i++;
        } else {
          break;
        }
      }
      
      elements.push({
        type: "list",
        ordered: true,
        items: items,
      });
      elementCount++;
      continue;
    }

    // Regular paragraphs
    const children = parseInlineElements(line);
    if (children.length === 1 && children[0].type === 'text') {
      elements.push({
        type: "paragraph",
        content: children[0].content,
      });
    } else {
      elements.push({
        type: "paragraph",
        children: children,
      });
    }
    elementCount++;
    i++;
  }

  const endTime = Date.now();
  const processTime = ((endTime - startTime) / 1000).toFixed(3) + 's';
  
  const result = {
    type: "document",
    children: elements,
  };

  const jsonString = JSON.stringify(result, null, 2);
  const jsonSize = (jsonString.length / 1024).toFixed(1) + ' KB';

  return {
    json: result,
    stats: {
      elements: elementCount,
      jsonSize,
      processTime,
    },
  };
}

function parseInlineElements(text: string): any[] {
  const elements: any[] = [];
  
  // Simple parser for inline elements
  const strongRegex = /\*\*(.*?)\*\*/g;
  const emRegex = /\*(.*?)\*/g;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const codeRegex = /`([^`]+)`/g;

  let lastIndex = 0;
  const matches: Array<{ type: string; content: string; url?: string; start: number; end: number }> = [];

  // Find all matches
  let match: RegExpExecArray | null;
  strongRegex.lastIndex = 0;
  while ((match = strongRegex.exec(text)) !== null) {
    matches.push({ type: 'strong', content: match[1], start: match.index, end: match.index + match[0].length });
  }
  
  emRegex.lastIndex = 0;
  while ((match = emRegex.exec(text)) !== null) {
    // Skip if this is part of a strong match
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

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build elements array
  matches.forEach(match => {
    // Add text before this match
    if (match.start > lastIndex) {
      const textContent = text.slice(lastIndex, match.start);
      if (textContent.trim()) {
        elements.push({ type: 'text', content: textContent });
      }
    }

    // Add the match element
    if (match.type === 'link') {
      elements.push({ type: 'link', content: match.content, url: match.url });
    } else {
      elements.push({ type: match.type, content: match.content });
    }

    lastIndex = match.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      elements.push({ type: 'text', content: remaining });
    }
  }

  // If no inline elements found, return simple text
  if (elements.length === 0 && text.trim()) {
    return [{ type: 'text', content: text.replace(/<[^>]*>/g, '') }];
  }

  return elements;
}

function parseListItems(body: string): any[] {
  const items: any[] = [];
  const itemRegex = /<li>([\s\S]*?)<\/li>/g;
  let match;

  while ((match = itemRegex.exec(body)) !== null) {
    const itemContent = match[1].replace(/<[^>]*>/g, '').trim();
    items.push({
      type: "list_item",
      content: itemContent,
    });
  }

  return items;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Convert markdown to JSON
  app.post("/api/convert", async (req, res) => {
    try {
      const validatedData = convertMarkdownSchema.parse(req.body);
      
      const result = parseMarkdownToStructuredJson(validatedData.markdown);
      
      // Store the conversion
      await storage.createConversion({
        markdownContent: validatedData.markdown,
        jsonOutput: JSON.stringify(result.json),
      });

      const response = convertMarkdownResponseSchema.parse(result);
      res.json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Upload and convert markdown file
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const markdown = req.file.buffer.toString('utf-8');
      const result = parseMarkdownToStructuredJson(markdown);
      
      // Store the conversion
      await storage.createConversion({
        markdownContent: markdown,
        jsonOutput: JSON.stringify(result.json),
      });

      const response = convertMarkdownResponseSchema.parse(result);
      res.json({ ...response, markdown });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Get recent conversions
  app.get("/api/conversions", async (req, res) => {
    try {
      const conversions = await storage.getRecentConversions(10);
      res.json(conversions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
