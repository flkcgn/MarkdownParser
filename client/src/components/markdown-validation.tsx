import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, XCircle, CheckCircle, Lightbulb } from "lucide-react";
import type { ValidationError } from "@/lib/markdown-parser";

interface MarkdownValidationProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  isValid: boolean;
}

export default function MarkdownValidation({ errors, warnings, isValid }: MarkdownValidationProps) {
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
          <Badge variant={errors.length > 0 ? "destructive" : "secondary"} className="ml-auto transition-all hover-scale">
            {errors.length + warnings.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {errors.map((error, index) => (
            <div key={`error-${index}`} className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200 transition-all hover-lift animate-slide-up animate-delay-${(index + 1) * 100}`}>
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-red-800">{error.message}</span>
                  {error.line && (
                    <Badge variant="outline" className="text-xs border-red-300 text-red-700 transition-all hover-scale">
                      Line {error.line}
                    </Badge>
                  )}
                </div>
                {error.suggestion && (
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error.suggestion}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {warnings.map((warning, index) => (
            <div key={`warning-${index}`} className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200 transition-all hover-lift animate-slide-up animate-delay-${(index + errors.length + 1) * 100}`}>
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-yellow-800">{warning.message}</span>
                  {warning.line && (
                    <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700 transition-all hover-scale">
                      Line {warning.line}
                    </Badge>
                  )}
                </div>
                {warning.suggestion && (
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-600">{warning.suggestion}</p>
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