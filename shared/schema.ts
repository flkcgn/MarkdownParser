import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  markdownContent: text("markdown_content").notNull(),
  jsonOutput: text("json_output").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversionSchema = createInsertSchema(conversions).pick({
  markdownContent: true,
  jsonOutput: true,
});

export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;

// API request/response schemas
export const convertMarkdownSchema = z.object({
  markdown: z.string().min(1, "Markdown content is required"),
});

// PKM Note schemas
export const noteMetadataSchema = z.object({
  created: z.string().optional(),
  modified: z.string().optional(),
  tags: z.array(z.string()).default([]),
  alias: z.union([z.string(), z.array(z.string())]).optional(),
  word_count: z.number(),
  internal_links: z.array(z.string()).default([]),
  external_links: z.array(z.string()).default([]),
  backlinks: z.array(z.string()).default([]),
}).catchall(z.any()); // Allow additional custom frontmatter fields

export const pkmNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: noteMetadataSchema,
  content: z.any(), // The existing parsed blocks
});

export const convertMarkdownResponseSchema = z.object({
  json: z.record(z.any()),
  stats: z.object({
    elements: z.number(),
    jsonSize: z.string(),
    processTime: z.string(),
  }),
  metadata: z.record(z.any()),
  pkm_note: pkmNoteSchema.optional(), // New PKM-formatted output
});

export type ConvertMarkdownRequest = z.infer<typeof convertMarkdownSchema>;
export type ConvertMarkdownResponse = z.infer<typeof convertMarkdownResponseSchema>;
export type PKMNote = z.infer<typeof pkmNoteSchema>;
export type NoteMetadata = z.infer<typeof noteMetadataSchema>;
