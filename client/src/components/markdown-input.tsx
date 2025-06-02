import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface MarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  onConvert: () => void;
  isLoading: boolean;
}

export default function MarkdownInput({ value, onChange, onConvert, isLoading }: MarkdownInputProps) {
  const [stats, setStats] = useState({ characters: 0, lines: 0, words: 0 });

  useEffect(() => {
    const characters = value.length;
    const lines = value.split('\n').length;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    setStats({ characters, lines, words });
  }, [value]);

  const placeholder = `# Welcome to Markdown to JSON Converter

## Features
- Convert markdown to structured JSON
- Support for headers, lists, and text formatting
- Real-time conversion
- **Bold text** and *italic text*

### Example List
1. First item
2. Second item
   - Nested bullet
   - Another nested item

[Visit Example](https://example.com)

> This is a blockquote

\`\`\`javascript
function example() {
    return 'Hello World';
}
\`\`\``;

  return (
    <div className="space-y-4">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-96 font-mono text-sm resize-none"
        disabled={isLoading}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-slate-500">
          <span>{stats.characters} characters</span>
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
        </div>
        <Button 
          onClick={onConvert} 
          disabled={!value.trim() || isLoading}
          className="bg-secondary hover:bg-emerald-600"
        >
          <Play className="h-4 w-4 mr-2" />
          {isLoading ? "Converting..." : "Convert"}
        </Button>
      </div>
    </div>
  );
}
