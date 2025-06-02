import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { CloudUpload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: isLoading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragActive && !isDragReject && "border-primary bg-blue-50",
          isDragReject && "border-red-300 bg-red-50",
          !isDragActive && "border-slate-300 hover:border-primary",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <CloudUpload className="h-6 w-6 text-slate-400" />
        </div>
        
        <h3 className="text-sm font-medium text-slate-800 mb-2">
          {isDragActive ? "Drop your file here" : "Upload Markdown File"}
        </h3>
        
        <p className="text-sm text-slate-500 mb-4">
          {isDragReject 
            ? "File type not supported" 
            : "Drag and drop your .md file here, or click to browse"
          }
        </p>
        
        {!isDragActive && (
          <Button 
            variant="outline" 
            disabled={isLoading}
            type="button"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isLoading ? "Uploading..." : "Choose File"}
          </Button>
        )}
      </div>
      
      <div className="text-sm text-slate-500 space-y-1">
        <p>Supported formats: .md, .markdown, .txt</p>
        <p>Maximum file size: 5MB</p>
      </div>
    </div>
  );
}
