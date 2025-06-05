import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Save, 
  FileText, 
  Eye,
  Code,
  Tag,
  Clock,
  Calendar,
  BookOpen,
  Link as LinkIcon,
  ChevronRight,
  Archive,
  Trash2,
  Share,
  Download,
  Settings
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MarkdownInput from "@/components/markdown-input";
import JsonOutput from "@/components/json-output";
import type { Note, SaveNoteRequest, GetNoteResponse } from "@shared/schema";
import { format } from "date-fns";
import { parseMarkdownPreview } from "@/lib/markdown-parser";

export default function EnhancedNoteEditor() {
  const [match, params] = useRoute<{ id: string }>("/notes/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const noteId = params?.id && params.id !== "new" ? Number(params.id) : undefined;

  // Load note data
  const { data: noteData, isLoading } = useQuery({
    queryKey: ["/api/notes", noteId],
    queryFn: async () => {
      if (!noteId) return null;
      const response = await apiRequest("GET", `/api/notes/${noteId}`);
      return response.json() as Promise<GetNoteResponse>;
    },
    enabled: !!noteId,
  });

  // Auto-convert markdown to JSON
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (markdown.trim()) {
        apiRequest("POST", "/api/convert", { markdown })
          .then((r) => r.json())
          .then((data) => setJsonOutput(data.json))
          .catch(() => {});
      } else {
        setJsonOutput(null);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [markdown]);

  // Load note data into form
  useEffect(() => {
    if (noteData?.note) {
      setTitle(noteData.note.title);
      setMarkdown(noteData.note.markdownContent);
      setJsonOutput(JSON.parse(noteData.note.jsonOutput));
      setTags(noteData.note.tags ? JSON.parse(noteData.note.tags) : []);
    } else if (noteId === undefined) {
      // New note
      setTitle("");
      setMarkdown("");
      setTags([]);
      setJsonOutput(null);
    }
  }, [noteData, noteId]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SaveNoteRequest) => {
      const response = await apiRequest("POST", "/api/notes", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      if (!noteId && data.note?.id) {
        setLocation(`/notes/${data.note.id}`);
      }
      toast({ title: "Note saved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disabled auto-save to prevent excessive API calls
  // Manual save only via save button

  const handleSave = useCallback(() => {
    if (!title.trim() || !markdown.trim()) {
      toast({
        title: "Missing content",
        description: "Title and markdown content are required",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      id: noteId,
      title,
      markdown,
      tags,
    });
  }, [title, markdown, tags, noteId, saveMutation, toast]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }, [tags]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  }, [handleAddTag]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 mr-4">
            <Input
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending || !title.trim() || !markdown.trim()}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors"
                onClick={() => handleRemoveTag(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-6 text-xs w-24 focus:w-32 transition-all"
              />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="h-6 px-2 text-xs"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Metadata */}
        {noteData?.note && (
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {format(new Date(noteData.note.createdAt), "MMM d, yyyy")}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {format(new Date(noteData.note.updatedAt), "MMM d, yyyy 'at' HH:mm")}
            </div>
            {noteData.note.wordCount && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {noteData.note.wordCount} words
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b border-gray-200 dark:border-gray-700 px-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="edit" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-1">
                <Code className="h-4 w-4" />
                JSON
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="edit" className="flex-1 p-4 overflow-hidden">
            <MarkdownInput
              value={markdown}
              onChange={setMarkdown}
              onConvert={() => {}}
              isLoading={false}
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full">
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ 
                  __html: markdown ? parseMarkdownPreview(markdown) : '<p class="text-gray-500">Start writing to see preview...</p>' 
                }}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="json" className="flex-1 p-4 overflow-hidden">
            <JsonOutput jsonData={jsonOutput} isLoading={false} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Backlinks */}
      {noteData?.backlinks && noteData.backlinks.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Backlinks ({noteData.backlinks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {noteData.backlinks.map(backlink => (
                  <button
                    key={backlink.id}
                    onClick={() => setLocation(`/notes/${backlink.id}`)}
                    className="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm text-blue-600 dark:text-blue-400">{backlink.title}</span>
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}