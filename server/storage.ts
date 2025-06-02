import { conversions, type Conversion, type InsertConversion } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversion(id: number): Promise<Conversion | undefined>;
  getRecentConversions(limit?: number): Promise<Conversion[]>;
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
}

export const storage = new DatabaseStorage();
