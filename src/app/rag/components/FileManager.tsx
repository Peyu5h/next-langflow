import { useEffect, useState } from "react";
import { FilesIcon, Trash2, Database } from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { handleTextEllipsis } from "~/lib/utils";

interface FileInfo {
  id: string;
  name: string;
  uploadDate: string;
}

interface FileManagerProps {
  onSelectFile: (fileId: string, fileName: string) => void;
  selectedFileId: string | null;
}

export const FileManager = ({
  onSelectFile,
  selectedFileId,
}: FileManagerProps) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<FileInfo[]>("/api/rag/files");

      if (response.success) {
        // Sort newest first
        const sortedFiles = response.data.sort((a, b) => {
          const dateA = new Date(a.uploadDate).getTime();
          const dateB = new Date(b.uploadDate).getTime();
          return dateB - dateA;
        });
        setFiles(sortedFiles);
      } else {
        throw new Error("Failed to fetch files");
      }
    } catch (error: any) {
      console.error("Error fetching files:", error);
      setError(error.message || "Failed to fetch files");
      toast.error(error.message || "Failed to fetch files");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      setIsDeleting(fileId);
      const response = await api.post("/api/rag/delete", { fileId });

      if (response.success) {
        toast.success("File deleted successfully");
        setFiles((prev) => prev.filter((file) => file.id !== fileId));

        if (selectedFileId === fileId) {
          onSelectFile("", "");
        }
      } else {
        throw new Error("Failed to delete file");
      }
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast.error(error.message || "Failed to delete file");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Unknown date";
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-4 w-4" />
              Your Documents
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFiles}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
              Loading files...
            </p>
          </div>
        ) : error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchFiles}
            >
              Try Again
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-20 flex-col items-center justify-center gap-2">
            <FilesIcon className="text-muted-foreground/50 h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              No documents found in database
            </p>
          </div>
        ) : (
          <div className="cursor-pointer space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${
                  selectedFileId === file.id
                    ? "bg-primary/10 ring-primary ring-1"
                    : "hover:bg-muted"
                }`}
              >
                <button
                  onClick={() => onSelectFile(file.id, file.name)}
                  className="flex flex-1 flex-col items-start gap-1 text-left text-sm"
                  disabled={isDeleting === file.id}
                >
                  <div className="flex w-full items-center gap-2">
                    <FilesIcon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 truncate font-medium">
                      {handleTextEllipsis(file.name, 24)}
                    </div>
                  </div>
                  <div className="text-muted-foreground pl-6 text-xs">
                    {formatDate(file.uploadDate)}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
