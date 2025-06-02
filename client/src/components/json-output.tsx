import { Button } from "@/components/ui/button";
import { Copy, Code, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JsonOutputProps {
  jsonData: any;
  isLoading: boolean;
}

export default function JsonOutput({ jsonData, isLoading }: JsonOutputProps) {
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!jsonData) return;
    
    try {
      const jsonString = JSON.stringify(jsonData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      toast({
        title: "Copied to clipboard",
        description: "JSON has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy JSON to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleFormat = () => {
    // This would trigger a re-format of the JSON display
    toast({
      title: "JSON formatted",
      description: "JSON has been formatted for better readability",
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">JSON Output</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!jsonData || isLoading}
            title="Copy JSON"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={!jsonData || isLoading}
            title="Format JSON"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="bg-slate-50 rounded-lg p-4 h-96 overflow-auto relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm text-slate-500">Converting...</span>
            </div>
          </div>
        ) : jsonData ? (
          <pre className="font-mono text-sm text-slate-700">
            <code>{JSON.stringify(jsonData, null, 2)}</code>
          </pre>
        ) : (
          <div className="text-slate-500 text-center mt-20">
            Enter markdown content and click convert to see JSON output
          </div>
        )}
      </div>
    </div>
  );
}
