import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { convertMarkdownSchema, convertMarkdownResponseSchema } from "@shared/schema";
import { PKMParser } from "@shared/pkm-parser";
import multer from "multer";
import { randomUUID } from "crypto";
import yaml from "yaml";

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

function countWords(markdown: string): number {
  // Remove fenced code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, " ");
  // Remove inline code
  text = text.replace(/`[^`]*`/g, " ");
  // Remove images entirely
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  // Replace links with just their text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Strip blockquote markers
  text = text.replace(/^\s*>\s?/gm, "");
  // Strip heading markers
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // Strip list markers
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  // Remove emphasis markers
  text = text.replace(/[*_~]/g, "");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Normalize whitespace
  text = text.replace(/[\n\r\t]+/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

function parseMarkdownToStructuredJson(markdown: string): any {
  const startTime = Date.now();

  let frontmatter: Record<string, any> = {};
  if (markdown.startsWith('---')) {
    const end = markdown.indexOf('---', 3);
    if (end !== -1) {
      try {
        frontmatter = yaml.parse(markdown.slice(3, end).trim()) || {};
      } catch {
        frontmatter = {};
      }
      markdown = markdown.slice(end + 3).replace(/^\s+/, '');
    }
  }

  const tags = new Set<string>();
  if (Array.isArray(frontmatter.tags)) {
    frontmatter.tags.forEach((t: string) => tags.add(t));
  } else if (typeof frontmatter.tags === 'string') {
    frontmatter.tags.split(/[,\s]+/).forEach((t) => t && tags.add(t));
  }

  const metadata: Record<string, any> = {};
  if (frontmatter.created) metadata.created = new Date(frontmatter.created).toISOString();
  if (frontmatter.modified) metadata.modified = new Date(frontmatter.modified).toISOString();
  if (frontmatter.alias) metadata.alias = frontmatter.alias;

  const custom = { ...frontmatter };
  delete custom.tags; delete custom.alias; delete custom.created; delete custom.modified; delete custom.title;
  Object.assign(metadata, custom);

  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();

  const lines = markdown.split('\n');
  const content: any[] = [];
  let elementCount = 0;
  let title: string | undefined = frontmatter.title;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) { i++; continue; }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      content.push({ type: 'heading', level, text });
      if (!title && level === 1) title = text;
      elementCount++; i++; continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      const langMatch = line.match(/^```(\w+)?/);
      const language = langMatch?.[1] || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]); i++; }
      content.push({ type: 'code_block', language, code: codeLines.join('\n') });
      elementCount++; i++; continue;
    }

    // Lists (unordered)
    const unorderedListMatch = line.match(/^[-*+]\s+(.+)/);
    const orderedListMatch = line.match(/^\d+\.\s+(.+)/);
    if (unorderedListMatch || orderedListMatch) {
      const ordered = Boolean(orderedListMatch);
      const items: any[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        const match = ordered ? current.match(/^\d+\.\s+(.+)/) : current.match(/^[-*+]\s+(.+)/);
        if (match) {
          const inline = parseInlineElements(match[1], internalLinks, externalLinks);
          if (inline.length === 1 && inline[0].type === 'text') {
            items.push({ text: inline[0].text });
          } else {
            items.push({ inline });
          }
          i++;
        } else if (current === '') {
          i++; } else { break; }
      }
      content.push({ type: 'list', ordered, items });
      elementCount++; continue;
    }

    // Regular paragraphs
    const inline = parseInlineElements(line, internalLinks, externalLinks);
    if (inline.length === 1 && inline[0].type === 'text') {
      content.push({ type: 'paragraph', text: inline[0].text });
    } else {
      content.push({ type: 'paragraph', inline });
    }
    elementCount++; i++;
  }

  const withoutCode = markdown.replace(/```[\s\S]*?```/g, ' ');
  const hashtagRegex = /(^|\s)#([a-zA-Z0-9_/-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = hashtagRegex.exec(withoutCode)) !== null) {
    tags.add(m[2]);
  }

  metadata.tags = Array.from(tags);
  metadata.internal_links = Array.from(internalLinks);
  metadata.external_links = Array.from(externalLinks);
  metadata.backlinks = [];
  metadata.word_count = countWords(markdown);

  const note = {
    id: randomUUID(),
    title: title || 'Untitled',
    metadata,
    content,
  };

  const jsonString = JSON.stringify(note, null, 2);
  const jsonSize = (jsonString.length / 1024).toFixed(1) + ' KB';
  const processTime = ((Date.now() - startTime) / 1000).toFixed(3) + 's';

  return {
    json: note,
    stats: {
      elements: elementCount,
      jsonSize,
      processTime,
    },
    metadata,
  };
}

function parseInlineElements(text: string, internalLinks: Set<string>, externalLinks: Set<string>): any[] {
  const elements: any[] = [];
  const regex = /(\[\[[^\]]+\]\]|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain.trim()) elements.push({ type: 'text', text: plain });
    }

    if (match[0].startsWith('[[')) {
      const wiki = match[0].slice(2, -2);
      const pipeIndex = wiki.indexOf('|');
      const hashIndex = wiki.indexOf('#');
      let note = wiki;
      let display = wiki;
      if (pipeIndex !== -1) {
        note = wiki.slice(0, pipeIndex);
        display = wiki.slice(pipeIndex + 1);
      }
      if (hashIndex !== -1) {
        note = note.slice(0, hashIndex);
      }
      note = note.trim();
      display = display.trim();
      internalLinks.add(note);
      elements.push({ type: 'internal_link', note, text: display });
    } else {
      const display = match[2];
      const url = match[3];
      externalLinks.add(url);
      elements.push({ type: 'external_link', url, text: display });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail.trim()) elements.push({ type: 'text', text: tail });
  }

  if (elements.length === 0 && text.trim()) {
    elements.push({ type: 'text', text });
  }

  return elements;
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Convert markdown to JSON with PKM features
  app.post("/api/convert", async (req, res) => {
    try {
      const validatedData = convertMarkdownSchema.parse(req.body);
      
      // Use PKM parser for comprehensive second brain functionality
      const pkmResult = PKMParser.parse(validatedData.markdown);
      const pkmNote = PKMParser.createPKMNote(pkmResult);
      
      // Enhanced JSON structure with PKM features and existing structured content
      const structuredContent = parseMarkdownToStructuredJson(validatedData.markdown);
      const result = {
        success: true,
        json: {
          ...pkmNote,
          structured_content: structuredContent.json,
          pkm_metadata: {
            frontmatter: pkmResult.frontmatter,
            internal_links: pkmResult.internalLinks,
            external_links: pkmResult.externalLinks,
            hashtags: pkmResult.hashtags,
            word_count: pkmResult.wordCount,
            title: pkmResult.title
          }
        }
      };
      
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
