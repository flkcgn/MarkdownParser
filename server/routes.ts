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
  
  // Configure marked for consistent output
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  // Custom renderer to create structured JSON
  const renderer = new marked.Renderer();
  const elements: any[] = [];
  let elementCount = 0;

  // Override renderer methods to capture structured data
  const originalHeading = renderer.heading;
  renderer.heading = function(text: string, level: number) {
    elements.push({
      type: "heading",
      level: level,
      content: text.replace(/<[^>]*>/g, ''), // Strip HTML tags
    });
    elementCount++;
    return originalHeading.call(this, text, level);
  };

  const originalParagraph = renderer.paragraph;
  renderer.paragraph = function(text: string) {
    // Parse inline elements
    const children = parseInlineElements(text);
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
    return originalParagraph.call(this, text);
  };

  const originalList = renderer.list;
  renderer.list = function(body: string, ordered: boolean) {
    const items = parseListItems(body);
    elements.push({
      type: "list",
      ordered: ordered,
      items: items,
    });
    elementCount++;
    return originalList.call(this, body, ordered);
  };

  const originalBlockquote = renderer.blockquote;
  renderer.blockquote = function(quote: string) {
    elements.push({
      type: "blockquote",
      content: quote.replace(/<[^>]*>/g, '').trim(),
    });
    elementCount++;
    return originalBlockquote.call(this, quote);
  };

  const originalCode = renderer.code;
  renderer.code = function(code: string, language?: string) {
    elements.push({
      type: "code_block",
      language: language || "text",
      content: code,
    });
    elementCount++;
    return originalCode.call(this, code, language);
  };

  const originalHr = renderer.hr;
  renderer.hr = function() {
    elements.push({
      type: "horizontal_rule",
    });
    elementCount++;
    return originalHr.call(this);
  };

  // Process the markdown
  marked(markdown, { renderer });

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
  let match;
  while ((match = strongRegex.exec(text)) !== null) {
    matches.push({ type: 'strong', content: match[1], start: match.index, end: match.index + match[0].length });
  }
  while ((match = emRegex.exec(text)) !== null) {
    // Skip if this is part of a strong match
    if (!matches.some(m => match.index >= m.start && match.index < m.end)) {
      matches.push({ type: 'emphasis', content: match[1], start: match.index, end: match.index + match[0].length });
    }
  }
  while ((match = linkRegex.exec(text)) !== null) {
    matches.push({ type: 'link', content: match[1], url: match[2], start: match.index, end: match.index + match[0].length });
  }
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
  const itemRegex = /<li>(.*?)<\/li>/gs;
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
