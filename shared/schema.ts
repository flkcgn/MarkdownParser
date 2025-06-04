import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  markdownContent: text("markdown_content").notNull(),
  jsonOutput: text("json_output").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  markdownContent: text("markdown_content").notNull(),
  jsonOutput: text("json_output").notNull(),
  tags: text("tags"),
  wikilinks: text("wikilinks"),
  wordCount: integer("word_count"),
  readingTime: integer("reading_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversionSchema = createInsertSchema(conversions).pick({
  markdownContent: true,
  jsonOutput: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  title: true,
  markdownContent: true,
  jsonOutput: true,
  tags: true,
  wikilinks: true,
  wordCount: true,
  readingTime: true,
});

export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;

export type InsertNote = typeof notes.$inferInsert;
export type Note = typeof notes.$inferSelect;

export const convertMarkdownSchema = z.object({
  markdown: z.string().min(1, "Markdown content is required"),
});

export const convertMarkdownResponseSchema = z.object({
  json: z.record(z.any()),
  stats: z.object({
    elements: z.number(),
    jsonSize: z.string(),
    processTime: z.string(),
  }),
  metadata: z.object({
    word_count: z.number(),
    reading_time: z.number(),
    tags: z.array(z.string()),
    wikilinks: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

export type ConvertMarkdownRequest = z.infer<typeof convertMarkdownSchema>;
export type ConvertMarkdownResponse = z.infer<typeof convertMarkdownResponseSchema>;

export const saveNoteSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  markdown: z.string().min(1, "Markdown content is required"),
  tags: z.array(z.string()).optional(),
});

export const saveNoteResponseSchema = convertMarkdownResponseSchema.extend({
  note: z.record(z.any()),
});

export type SaveNoteRequest = z.infer<typeof saveNoteSchema>;
export type SaveNoteResponse = z.infer<typeof saveNoteResponseSchema>;

export const noteSchema = z.object({
  id: z.number(),
  title: z.string(),
  markdownContent: z.string(),
  jsonOutput: z.string(),
  tags: z.string().nullable(),
  wikilinks: z.string().nullable(),
  wordCount: z.number().nullable(),
  readingTime: z.number().nullable(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export const getNoteResponseSchema = z.object({
  note: noteSchema,
  backlinks: z.array(noteSchema),
});

export type GetNoteResponse = z.infer<typeof getNoteResponseSchema>;
