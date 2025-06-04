import { conversions, notes, type Conversion, type InsertConversion, type InsertNote, type Note } from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike } from "drizzle-orm";

export interface IStorage {
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversion(id: number): Promise<Conversion | undefined>;
  getRecentConversions(limit?: number): Promise<Conversion[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: InsertNote): Promise<Note>;
  getNote(id: number): Promise<Note | undefined>;
  getBacklinks(title: string): Promise<Note[]>;
}

export class DatabaseStorage implements IStorage {
  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const [conversion] = await db
      .insert(conversions)
      .values(insertConversion)
      .returning();
    return conversion;
  }

  async getConversion(id: number): Promise<Conversion | undefined> {
    const [conversion] = await db.select().from(conversions).where(eq(conversions.id, id));
    return conversion || undefined;
  }

  async getRecentConversions(limit: number = 10): Promise<Conversion[]> {
    return await db
      .select()
      .from(conversions)
      .orderBy(desc(conversions.createdAt))
      .limit(limit);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(insertNote).returning();
    return note;
  }

  async updateNote(id: number, note: InsertNote): Promise<Note> {
    const [updated] = await db
      .update(notes)
      .set(note)
      .where(eq(notes.id, id))
      .returning();
    return updated;
  }

  async getNote(id: number): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }

  async getBacklinks(title: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(ilike(notes.wikilinks, `%${title}%`));
  }
}

export const storage = new DatabaseStorage();
