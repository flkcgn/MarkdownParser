import { conversions, type Conversion, type InsertConversion } from "@shared/schema";

export interface IStorage {
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversion(id: number): Promise<Conversion | undefined>;
  getRecentConversions(limit?: number): Promise<Conversion[]>;
}

export class MemStorage implements IStorage {
  private conversions: Map<number, Conversion>;
  private currentId: number;

  constructor() {
    this.conversions = new Map();
    this.currentId = 1;
  }

  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const id = this.currentId++;
    const conversion: Conversion = {
      ...insertConversion,
      id,
      createdAt: new Date(),
    };
    this.conversions.set(id, conversion);
    return conversion;
  }

  async getConversion(id: number): Promise<Conversion | undefined> {
    return this.conversions.get(id);
  }

  async getRecentConversions(limit: number = 10): Promise<Conversion[]> {
    return Array.from(this.conversions.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
