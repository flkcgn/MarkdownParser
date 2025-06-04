import { useState, useEffect, useRef } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleJumpToLine = (lineNumber: number) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const lines = value.split('\n');
    let position = 0;
    
    // Calculate the character position of the target line
    for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
      position += lines[i].length + 1; // +1 for the newline character
    }
    
    // Clear any existing timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    
    // Reset animation by removing and re-adding the class
    textarea.classList.remove('textarea-highlight');
    
    // Use a small delay to ensure the class is fully removed
    setTimeout(() => {
      // Focus the textarea and set cursor position
      textarea.focus();
      textarea.setSelectionRange(position, position + (lines[lineNumber - 1]?.length || 0));
      
      // Add highlight effect
      textarea.classList.add('textarea-highlight');
      
      // Remove highlight after animation
      highlightTimeoutRef.current = setTimeout(() => {
        textarea.classList.remove('textarea-highlight');
      }, 2500);
    }, 50);
    
    // Scroll to the line with better positioning
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    
    // Calculate scroll position to center the target line
    const targetScrollTop = Math.max(0, (lineNumber - 3) * lineHeight - paddingTop);
    
    // Smooth scroll to the target position
    textarea.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  };

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
    <div className="space-y-4 animate-fade-in">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-h-96 font-mono text-sm resize-none transition-all focus:scale-[1.01] ${
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
          onJumpToLine={handleJumpToLine}
          onApplyFix={onChange}
          currentMarkdown={value}
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
          className={`transition-all hover-lift ${validation.errors.length > 0 ? 
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
