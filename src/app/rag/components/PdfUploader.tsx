import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { LucideLoader2, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/lib/api";
import FileTextExtractor from "~/lib/pdf-extractor";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { handleTextEllipsis } from "~/lib/utils";

interface UploadResponse {
  fileId: string;
  fileName: string;
  uploadDate: string;
}

interface PdfUploaderProps {
  onUploadSuccess: (fileId: string, fileName: string) => void;
}

export const PdfUploader = ({ onUploadSuccess }: PdfUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("document.pdf");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Listen for file input change events
  useEffect(() => {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          setFileName(target.files[0].name);
        }
      });
    });

    // Cleanup event listeners
    return () => {
      fileInputs.forEach((input) => {
        input.removeEventListener("change", () => {});
      });
    };
  }, []);

  const handleTextExtracted = (text: string) => {
    setExtractedText(text);
    toast.success("Text successfully extracted!");
    // Reset any previous errors
    setUploadError(null);
  };

  const simulateProgress = () => {
    // Reset progress
    setUploadProgress(0);

    // Use interval to increment progress during upload
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        // Only go up to 95% - the final 5% will happen when the request completes
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 1;
      });
    }, 500);

    return interval;
  };

  const handleUpload = async () => {
    if (!extractedText) {
      toast.error("Please extract text from a document first");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // Start progress simulation
    const progressInterval = simulateProgress();

    try {
      // Create request data
      const data = {
        fileName: fileName,
        extractedText: extractedText,
      };

      // Increase timeout for large documents (2 minutes)
      const response = await api.post<UploadResponse>("/api/rag/upload", data, {
        timeout: 120000, // 2 minute timeout
      });

      if (response.success) {
        // Set progress to 100% when complete
        setUploadProgress(100);
        toast.success("Document uploaded successfully!");
        onUploadSuccess(response.data.fileId, response.data.fileName);
        setExtractedText("");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error: any) {
      console.error("Upload error:", error);

      let errorMessage = "Failed to upload document";

      if (error.name === "AbortError" || error.code === "ETIMEDOUT") {
        errorMessage =
          "Upload timed out. The document may be too large or the server is busy.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      // Clear the progress interval
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Upload className="text-primary h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Upload Document</h3>
            </div>
          </div>

          {uploadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <FileTextExtractor
            label="Select a PDF document"
            setExtractedText={handleTextExtracted}
          />

          {extractedText && (
            <div className="mt-6 w-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">
                    Text extracted from: {handleTextEllipsis(fileName)}
                  </span>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? (
                    <>
                      <LucideLoader2 className="h-4 w-4 animate-spin" />
                      {uploadProgress < 100 ? "Processing..." : "Finalizing..."}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-full" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>

              {isUploading && (
                <div className="bg-muted mb-4 h-2.5 w-full rounded-full">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <p className="text-muted-foreground mt-1 text-right text-xs">
                    {uploadProgress < 95
                      ? "Creating vector embeddings..."
                      : "Storing in database..."}
                  </p>
                </div>
              )}

              <div className="relative">
                <div className="bg-primary/10 absolute -left-4 h-full w-1 rounded-full"></div>
                <div className="bg-muted/30 max-h-48 overflow-y-auto rounded-md border p-3 text-sm">
                  {extractedText.slice(0, 500)}
                  {extractedText.length > 500 && (
                    <span className="text-muted-foreground">
                      ... {extractedText.length - 500} more characters
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
