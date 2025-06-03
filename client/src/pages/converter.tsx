import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Download, Trash2, Clock, FileText, Code, History, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import MarkdownInput from "@/components/markdown-input";
import JsonOutput from "@/components/json-output";
import FileUpload from "@/components/file-upload";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { validateMarkdown } from "@/lib/markdown-parser";
import type { ConvertMarkdownRequest, ConvertMarkdownResponse, Conversion } from "@shared/schema";

export default function ConverterPage() {
  const [markdown, setMarkdown] = useState("");
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [stats, setStats] = useState({
    elements: 0,
    jsonSize: "0 KB",
    processTime: "0.00s",
  });
  const { toast } = useToast();

  // Fetch recent conversions from database
  const { data: recentConversions, refetch: refetchConversions } = useQuery({
    queryKey: ['/api/conversions'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/conversions");
      return response.json() as Promise<Conversion[]>;
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (data: ConvertMarkdownRequest) => {
      const response = await apiRequest("POST", "/api/convert", data);
      return response.json() as Promise<ConvertMarkdownResponse>;
    },
    onSuccess: (data) => {
      setJsonOutput(data.json);
      setStats(data.stats);
      refetchConversions(); // Refresh the conversion history
      toast({
        title: "Conversion successful!",
        description: `Converted ${data.stats.elements} elements in ${data.stats.processTime}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Conversion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMarkdown(data.markdown);
      setJsonOutput(data.json);
      setStats(data.stats);
      refetchConversions(); // Refresh the conversion history
      toast({
        title: "File uploaded successfully!",
        description: `Converted ${data.stats.elements} elements from your file`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConvert = () => {
    if (!markdown.trim()) {
      toast({
        title: "No content to convert",
        description: "Please enter some markdown content first",
        variant: "destructive",
      });
      return;
    }
    convertMutation.mutate({ markdown });
  };

  const handleFileUpload = (file: File) => {
    uploadMutation.mutate(file);
  };

  const handleClear = () => {
    setMarkdown("");
    setJsonOutput(null);
    setStats({
      elements: 0,
      jsonSize: "0 KB",
      processTime: "0.00s",
    });
    toast({
      title: "Content cleared",
      description: "All content has been cleared",
    });
  };

  const handleDownload = () => {
    if (!jsonOutput) {
      toast({
        title: "No JSON to download",
        description: "Please convert some markdown first",
        variant: "destructive",
      });
      return;
    }

    const jsonString = JSON.stringify(jsonOutput, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-markdown.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Your JSON file is being downloaded",
    });
  };

  const isLoading = convertMutation.isPending || uploadMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Markdown to JSON</h1>
                <p className="text-xs text-slate-500">Convert markdown syntax to structured JSON</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClear}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <Button 
                onClick={handleDownload} 
                disabled={!jsonOutput || isLoading}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Tabs defaultValue="text" className="w-full">
              {/* Input Section */}
              <div className="border-b border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800">Input Markdown</CardTitle>
                  <TabsList className="w-fit">
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Text Input
                    </TabsTrigger>
                    <TabsTrigger value="file" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      File Upload
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <div className="px-6 pb-6">
                  <TabsContent value="text">
                    <MarkdownInput
                      value={markdown}
                      onChange={setMarkdown}
                      onConvert={handleConvert}
                      isLoading={isLoading}
                    />
                  </TabsContent>

                  <TabsContent value="file">
                    <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
                  </TabsContent>
                </div>
              </div>

              {/* Output Section */}
              <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
                <JsonOutput jsonData={jsonOutput} isLoading={isLoading} />
                
                {/* Preview Section */}
                <div className="p-6 bg-slate-50">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Preview</h3>
                  <div className="bg-white rounded-lg p-4 h-96 overflow-auto prose prose-sm max-w-none">
                    {markdown ? (
                      <div dangerouslySetInnerHTML={{ __html: markdown }} />
                    ) : (
                      <div className="text-slate-500 text-center mt-20">
                        Enter markdown content to see preview
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {stats.elements} Elements
                  </p>
                  <p className="text-xs text-slate-500">Parsed from markdown</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Code className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{stats.jsonSize}</p>
                  <p className="text-xs text-slate-500">JSON output size</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{stats.processTime}</p>
                  <p className="text-xs text-slate-500">Processing time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                {(() => {
                  if (!markdown.trim()) {
                    return (
                      <>
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">No Content</p>
                          <p className="text-xs text-slate-500">Enter markdown to validate</p>
                        </div>
                      </>
                    );
                  }
                  
                  const validation = validateMarkdown(markdown);
                  if (validation.errors.length > 0) {
                    return (
                      <>
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{validation.errors.length} Error{validation.errors.length !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-slate-500">Fix errors to convert</p>
                        </div>
                      </>
                    );
                  } else if (validation.warnings.length > 0) {
                    return (
                      <>
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{validation.warnings.length} Warning{validation.warnings.length !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-slate-500">Style suggestions</p>
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">Valid Syntax</p>
                          <p className="text-xs text-slate-500">Ready to convert</p>
                        </div>
                      </>
                    );
                  }
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Conversions History */}
        {recentConversions && recentConversions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Conversions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentConversions.slice(0, 5).map((conversion, index) => (
                  <div 
                    key={conversion.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => {
                      setMarkdown(conversion.markdownContent);
                      setJsonOutput(JSON.parse(conversion.jsonOutput));
                      toast({
                        title: "Conversion loaded",
                        description: "Previous conversion has been loaded",
                      });
                    }}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {conversion.markdownContent.substring(0, 60)}
                        {conversion.markdownContent.length > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {conversion.createdAt ? new Date(conversion.createdAt).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      #{conversion.id}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
