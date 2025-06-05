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

export const convertMarkdownResponseSchema = z.object({
  json: z.record(z.any()),
  stats: z.object({
    elements: z.number(),
    jsonSize: z.string(),
    processTime: z.string(),
  }),
  metadata: z.object({
    word_count: z.number(),
  }),
});

export type ConvertMarkdownRequest = z.infer<typeof convertMarkdownSchema>;
export type ConvertMarkdownResponse = z.infer<typeof convertMarkdownResponseSchema>;
