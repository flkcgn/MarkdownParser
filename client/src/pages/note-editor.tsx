import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import MarkdownInput from "@/components/markdown-input";
import JsonOutput from "@/components/json-output";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SaveNoteRequest, GetNoteResponse } from "@shared/schema";

export default function NoteEditorPage() {
  const [match, params] = useRoute<{ id: string }>("/notes/:id");
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const noteId = params?.id && params.id !== "new" ? Number(params.id) : undefined;

  useEffect(() => {
    if (noteId !== undefined) {
      apiRequest("GET", `/api/notes/${noteId}`)
        .then((r) => r.json() as Promise<GetNoteResponse>)
        .then((data) => {
          setTitle(data.note.title);
          setMarkdown(data.note.markdownContent);
          setJsonOutput(JSON.parse(data.note.jsonOutput));
          setBacklinks(data.backlinks);
        })
        .catch((err) =>
          toast({
            title: "Failed to load note",
            description: err.message,
            variant: "destructive",
          }),
        );
    }
  }, [noteId]);

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

  const handleSave = async () => {
    if (!title.trim() || !markdown.trim()) {
      toast({
        title: "Missing content",
        description: "Title and markdown are required",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    const payload: SaveNoteRequest = { id: noteId, title, markdown };
    try {
      const res = await apiRequest("POST", "/api/notes", payload);
      const data = await res.json();
      setJsonOutput(data.json);
      toast({ title: "Note saved" });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <input
          className="border rounded p-2 w-full mr-4"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <MarkdownInput
          value={markdown}
          onChange={setMarkdown}
          onConvert={() => {}}
          isLoading={false}
        />
        <JsonOutput jsonData={jsonOutput} isLoading={false} />
      </div>
      {backlinks.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Backlinks</h3>
          <ul className="list-disc pl-5 space-y-1">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link href={`/notes/${b.id}`}>{b.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
