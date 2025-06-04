import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar,
  Tag,
  Clock,
  BookOpen,
  Archive,
  Trash2,
  Filter,
  SortAsc,
  SortDesc
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Note } from "@shared/schema";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

interface NoteSidebarProps {
  className?: string;
}

export default function NoteSidebar({ className }: NoteSidebarProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">("updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: notesData, isLoading } = useQuery({
    queryKey: ["/api/notes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notes");
      return response.json() as Promise<{ notes: Note[] }>;
    },
  });

  const notes = notesData?.notes || [];

  // Extract all unique tags from notes
  const allTags = Array.from(
    new Set(
      notes
        .filter(note => note.tags)
        .flatMap(note => JSON.parse(note.tags || "[]"))
    )
  );

  // Filter and sort notes
  const filteredNotes = notes
    .filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           note.markdownContent.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = !selectedTag || 
                        (note.tags && JSON.parse(note.tags).includes(selectedTag));
      
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "created":
          comparison = new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
          break;
        case "updated":
        default:
          comparison = new Date(a.updatedAt || '').getTime() - new Date(b.updatedAt || '').getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const formatNoteDate = (date: string | Date | null) => {
    if (!date) return "Unknown";
    const noteDate = new Date(date);
    if (isNaN(noteDate.getTime())) return "Unknown";
    
    if (isToday(noteDate)) {
      return `Today ${format(noteDate, "HH:mm")}`;
    } else if (isYesterday(noteDate)) {
      return `Yesterday ${format(noteDate, "HH:mm")}`;
    } else {
      return formatDistanceToNow(noteDate, { addSuffix: true });
    }
  };

  const getCurrentNoteId = () => {
    const match = location.match(/\/notes\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const currentNoteId = getCurrentNoteId();

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Notes
          </h1>
          <Link href="/notes/new">
            <Button size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Filter and Sort */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="h-7 px-2"
          >
            {sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
          </Button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-7 px-2 text-xs border rounded bg-background"
          >
            <option value="updated">Updated</option>
            <option value="created">Created</option>
            <option value="title">Title</option>
          </select>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={selectedTag === null ? "default" : "outline"}
                className="text-xs cursor-pointer h-5"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Badge>
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="text-xs cursor-pointer h-5"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery || selectedTag ? "No notes match your filters" : "No notes yet"}
            </div>
          ) : (
            filteredNotes.map(note => {
              const noteTags = note.tags ? JSON.parse(note.tags) : [];
              const isActive = currentNoteId === note.id;
              
              return (
                <Link key={note.id} href={`/notes/${note.id}`}>
                  <Card className={`cursor-pointer transition-all hover:shadow-sm ${
                    isActive ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
                          {note.title}
                        </h3>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {note.markdownContent.replace(/[#*`>-]/g, '').substring(0, 100)}...
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatNoteDate(note.updatedAt)}
                          </div>
                          {note.wordCount && (
                            <span>{note.wordCount} words</span>
                          )}
                        </div>
                        
                        {noteTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {noteTags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs h-4 px-1">
                                {tag}
                              </Badge>
                            ))}
                            {noteTags.length > 3 && (
                              <Badge variant="outline" className="text-xs h-4 px-1">
                                +{noteTags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Total notes:</span>
            <span>{notes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total words:</span>
            <span>{notes.reduce((sum, note) => sum + (note.wordCount || 0), 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}