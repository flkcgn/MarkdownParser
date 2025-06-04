import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';
import type { PKMNote, NoteMetadata } from './schema';

export interface InternalLink {
  type: 'internal_link';
  note: string;
  text: string;
}

export interface ExternalLink {
  type: 'external_link';
  url: string;
  text: string;
}

export interface PKMParseResult {
  frontmatter: Record<string, any>;
  content: string;
  internalLinks: string[];
  externalLinks: string[];
  hashtags: string[];
  wordCount: number;
  title: string;
}

export class PKMParser {
  // Extract YAML frontmatter and content
  static parseFrontmatter(markdown: string): { data: Record<string, any>; content: string } {
    const result = matter(markdown);
    return {
      data: result.data,
      content: result.content
    };
  }

  // Extract hashtags from content
  static extractHashtags(content: string): string[] {
    const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
    const hashtags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1]);
    }
    
    // Remove duplicates manually for compatibility
    const uniqueTags: string[] = [];
    hashtags.forEach(tag => {
      if (!uniqueTags.includes(tag)) {
        uniqueTags.push(tag);
      }
    });
    return uniqueTags;
  }

  // Extract internal wikilinks
  static extractInternalLinks(content: string): string[] {
    const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;
    
    while ((match = wikilinkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    
    // Remove duplicates manually for compatibility
    const uniqueLinks: string[] = [];
    links.forEach(link => {
      if (!uniqueLinks.includes(link)) {
        uniqueLinks.push(link);
      }
    });
    return uniqueLinks;
  }

  // Extract external markdown links
  static extractExternalLinks(content: string): string[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: string[] = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[2];
      // Only include external URLs (http/https)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        links.push(url);
      }
    }
    
    // Remove duplicates manually for compatibility
    const uniqueLinks: string[] = [];
    links.forEach(link => {
      if (!uniqueLinks.includes(link)) {
        uniqueLinks.push(link);
      }
    });
    return uniqueLinks;
  }

  // Replace internal links with structured objects
  static replaceInternalLinks(content: string): string {
    return content.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
      const linkObj: InternalLink = {
        type: 'internal_link',
        note: linkText,
        text: linkText
      };
      return JSON.stringify(linkObj);
    });
  }

  // Replace external links with structured objects
  static replaceExternalLinks(content: string): string {
    return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      // Only replace external URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const linkObj: ExternalLink = {
          type: 'external_link',
          url: url,
          text: text
        };
        return JSON.stringify(linkObj);
      }
      return match; // Keep non-external links as-is
    });
  }

  // Calculate word count from visible text
  static calculateWordCount(content: string): number {
    // Remove markdown syntax and count words
    const cleanText = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // Remove wikilinks, keep text
      .replace(/#[a-zA-Z0-9_-]+/g, '') // Remove hashtags
      .replace(/#+\s*/g, '') // Remove heading markers
      .replace(/[^\w\s]/g, ' ') // Remove other markdown syntax
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (!cleanText) return 0;
    return cleanText.split(' ').length;
  }

  // Extract title from content or filename
  static extractTitle(content: string, filename?: string): string {
    // First, try to find H1 heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // If no H1, try filename without extension
    if (filename) {
      return filename.replace(/\.[^/.]+$/, ''); // Remove file extension
    }

    // Fallback to first line or "Untitled"
    const firstLine = content.split('\n')[0];
    if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, '').trim();
    }

    return 'Untitled Note';
  }

  // Generate unique ID for note
  static generateNoteId(title: string): string {
    // Create a stable ID based on title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Add UUID for uniqueness
    const uuid = uuidv4().slice(0, 8);
    return `${slug}-${uuid}`;
  }

  // Main parsing function
  static parse(markdown: string, filename?: string): PKMParseResult {
    const { data: frontmatter, content } = this.parseFrontmatter(markdown);
    
    const internalLinks = this.extractInternalLinks(content);
    const externalLinks = this.extractExternalLinks(content);
    const hashtags = this.extractHashtags(content);
    const wordCount = this.calculateWordCount(content);
    const title = this.extractTitle(content, filename);

    return {
      frontmatter,
      content,
      internalLinks,
      externalLinks,
      hashtags,
      wordCount,
      title
    };
  }

  // Create full PKM note structure
  static createPKMNote(
    markdown: string, 
    existingContent: any, 
    filename?: string
  ): PKMNote {
    const parseResult = this.parse(markdown, filename);
    
    // Merge frontmatter tags with extracted hashtags
    const frontmatterTags = Array.isArray(parseResult.frontmatter.tags) 
      ? parseResult.frontmatter.tags 
      : parseResult.frontmatter.tags 
      ? [parseResult.frontmatter.tags] 
      : [];
    
    // Merge and deduplicate tags manually for compatibility
    const allTags: string[] = [];
    frontmatterTags.forEach(tag => {
      if (!allTags.includes(tag)) {
        allTags.push(tag);
      }
    });
    parseResult.hashtags.forEach(tag => {
      if (!allTags.includes(tag)) {
        allTags.push(tag);
      }
    });

    const metadata: NoteMetadata = {
      created: parseResult.frontmatter.created || new Date().toISOString(),
      modified: parseResult.frontmatter.modified || new Date().toISOString(),
      tags: allTags,
      alias: parseResult.frontmatter.alias,
      word_count: parseResult.wordCount,
      internal_links: parseResult.internalLinks,
      external_links: parseResult.externalLinks,
      backlinks: [],
      // Include any additional frontmatter fields
      ...Object.keys(parseResult.frontmatter).reduce((acc, key) => {
        if (!['created', 'modified', 'tags', 'alias'].includes(key)) {
          acc[key] = parseResult.frontmatter[key];
        }
        return acc;
      }, {} as Record<string, any>)
    };

    return {
      id: this.generateNoteId(parseResult.title),
      title: parseResult.title,
      metadata,
      content: existingContent
    };
  }
}