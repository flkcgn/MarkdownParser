import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, XCircle, CheckCircle, Lightbulb, Wand2, RotateCcw } from "lucide-react";
import type { ValidationError } from "@/lib/markdown-parser";
import { applyAutofix, applyAllAutofixes } from "@/lib/markdown-parser";

interface MarkdownValidationProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  isValid: boolean;
  onJumpToLine?: (line: number) => void;
  onApplyFix?: (fixedMarkdown: string) => void;
  currentMarkdown?: string;
}

export default function MarkdownValidation({ errors, warnings, isValid, onJumpToLine, onApplyFix, currentMarkdown }: MarkdownValidationProps) {
  const handleApplyFix = (error: ValidationError) => {
    if (!error.autofix || !currentMarkdown || !onApplyFix) return;
    const fixedMarkdown = applyAutofix(currentMarkdown, error.autofix);
    onApplyFix(fixedMarkdown);
  };

  const handleFixAll = () => {
    if (!currentMarkdown || !onApplyFix) return;
    const allErrors = [...errors, ...warnings];
    const fixedMarkdown = applyAllAutofixes(currentMarkdown, allErrors);
    onApplyFix(fixedMarkdown);
  };

  const fixableErrors = [...errors, ...warnings].filter(error => error.autofix);

  if (isValid && warnings.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 animate-fade-in transition-all hover-lift">
        <CardContent className="p-4">
          <div className="flex items-center animate-slide-in-left">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">Markdown syntax is valid</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`animate-fade-in transition-all hover-lift ${errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <CardHeader className="pb-3 animate-slide-in-left">
        <CardTitle className="flex items-center gap-2 text-sm">
          {errors.length > 0 ? (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800">Syntax Issues Found</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-800">Style Warnings</span>
            </>
          )}
          <Badge variant={errors.length > 0 ? "destructive" : "secondary"} className="transition-all hover-scale">
            {errors.length + warnings.length}
          </Badge>
          {fixableErrors.length > 0 && onApplyFix && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleFixAll}
              className="ml-auto text-xs h-6 px-2 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Fix All ({fixableErrors.length})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {errors.map((error, index) => (
            <div 
              key={`error-${index}`} 
              className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200 transition-all hover-lift animate-slide-up animate-delay-${(index + 1) * 100} ${error.line && onJumpToLine ? 'cursor-pointer hover:bg-red-25' : ''}`}
              onClick={() => error.line && onJumpToLine && onJumpToLine(error.line)}
            >
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-red-800">{error.message}</span>
                  {error.line && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs border-red-300 text-red-700 transition-all hover-scale ${onJumpToLine ? 'cursor-pointer hover:bg-red-100' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToLine && onJumpToLine(error.line!);
                      }}
                    >
                      Line {error.line}
                    </Badge>
                  )}
                </div>
                {error.suggestion && (
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-600">{error.suggestion}</p>
                      {error.autofix && onApplyFix && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFix(error);
                          }}
                          className="mt-2 text-xs h-6 px-2 bg-white hover:bg-red-50 border-red-200 text-red-700 hover:text-red-800"
                        >
                          <Wand2 className="h-3 w-3 mr-1" />
                          Apply Fix
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {warnings.map((warning, index) => (
            <div 
              key={`warning-${index}`} 
              className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200 transition-all hover-lift animate-slide-up animate-delay-${(index + errors.length + 1) * 100} ${warning.line && onJumpToLine ? 'cursor-pointer hover:bg-yellow-25' : ''}`}
              onClick={() => warning.line && onJumpToLine && onJumpToLine(warning.line)}
            >
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-yellow-800">{warning.message}</span>
                  {warning.line && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs border-yellow-300 text-yellow-700 transition-all hover-scale ${onJumpToLine ? 'cursor-pointer hover:bg-yellow-100' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToLine && onJumpToLine(warning.line!);
                      }}
                    >
                      Line {warning.line}
                    </Badge>
                  )}
                </div>
                {warning.suggestion && (
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-600">{warning.suggestion}</p>
                      {warning.autofix && onApplyFix && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFix(warning);
                          }}
                          className="mt-2 text-xs h-6 px-2 bg-white hover:bg-yellow-50 border-yellow-200 text-yellow-700 hover:text-yellow-800"
                        >
                          <Wand2 className="h-3 w-3 mr-1" />
                          Apply Fix
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}