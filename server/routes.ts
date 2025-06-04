import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  convertMarkdownSchema,
  convertMarkdownResponseSchema,
  saveNoteSchema,
  saveNoteResponseSchema,
} from "@shared/schema";
import { parseMarkdownToStructuredJson } from "@shared/parser";
// marked is installed only for the client, avoid using it here to keep the
// server lightweight. We'll implement our own simple word counter instead of
// relying on marked for stripping markdown.
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

  // Create or update a note
  app.post("/api/notes", async (req, res) => {
    try {
      const validated = saveNoteSchema.parse(req.body);
      const result = parseMarkdownToStructuredJson(validated.markdown);

      const mergedTags = Array.from(new Set([
        ...result.metadata.tags,
        ...(validated.tags || []),
      ]));

      const noteData = {
        title: validated.title,
        markdownContent: validated.markdown,
        jsonOutput: JSON.stringify(result.json),
        tags: mergedTags.length ? mergedTags.join(',') : null,
        wikilinks: result.metadata.wikilinks.join(','),
        wordCount: result.metadata.word_count,
        readingTime: result.metadata.reading_time,
        updatedAt: new Date(result.metadata.updated_at),
      };

      let note;
      if (validated.id) {
        note = await storage.updateNote(validated.id, noteData);
      } else {
        note = await storage.createNote({
          ...noteData,
          createdAt: new Date(result.metadata.created_at),
        });
      }

      const response = saveNoteResponseSchema.parse({
        ...result,
        note,
      });

      res.json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Retrieve a single note and its backlinks
  app.get("/api/notes/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const note = await storage.getNote(id);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      const backlinks = (await storage.getBacklinks(note.title)).filter(
        (b) => b.id !== note.id,
      );

      res.json({ note, backlinks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });

  // Get all notes
  app.get("/api/notes", async (req, res) => {
    try {
      const notes = await storage.getAllNotes();
      res.json({ notes });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // Delete a note
  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteNote(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
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
