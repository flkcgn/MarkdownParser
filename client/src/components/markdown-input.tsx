import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { validateMarkdown, type ValidationError } from "@/lib/markdown-parser";
import MarkdownValidation from "./markdown-validation";

interface MarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  onConvert: () => void;
  isLoading: boolean;
}

export default function MarkdownInput({ value, onChange, onConvert, isLoading }: MarkdownInputProps) {
  const [stats, setStats] = useState({ characters: 0, lines: 0, words: 0 });
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  }>({ isValid: true, errors: [], warnings: [] });

  useEffect(() => {
    const characters = value.length;
    const lines = value.split('\n').length;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    setStats({ characters, lines, words });

    // Validate markdown if there's content
    if (value.trim()) {
      const validationResult = validateMarkdown(value);
      setValidation(validationResult);
    } else {
      setValidation({ isValid: true, errors: [], warnings: [] });
    }
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
        className={`min-h-96 font-mono text-sm resize-none ${
          validation.errors.length > 0 ? 'border-red-300 focus:border-red-500' : 
          validation.warnings.length > 0 ? 'border-yellow-300 focus:border-yellow-500' : ''
        }`}
        disabled={isLoading}
      />
      
      {/* Validation feedback */}
      {value.trim() && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <MarkdownValidation 
          errors={validation.errors}
          warnings={validation.warnings}
          isValid={validation.isValid}
        />
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-slate-500">
          <span>{stats.characters} characters</span>
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
          {validation.errors.length > 0 && (
            <span className="text-red-600 font-medium">
              {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
            </span>
          )}
          {validation.warnings.length > 0 && (
            <span className="text-yellow-600 font-medium">
              {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Button 
          onClick={onConvert} 
          disabled={!value.trim() || isLoading || validation.errors.length > 0}
          className={`${validation.errors.length > 0 ? 
            'bg-gray-400 cursor-not-allowed' : 
            'bg-secondary hover:bg-emerald-600'}`}
        >
          <Play className="h-4 w-4 mr-2" />
          {isLoading ? "Converting..." : 
           validation.errors.length > 0 ? "Fix errors to convert" : "Convert"}
        </Button>
      </div>
    </div>
  );
}
