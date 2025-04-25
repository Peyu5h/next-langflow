"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { toast } from "sonner";
import { api } from "~/lib/api";
import FileTextExtractor from "~/components/FileTextExtracter";
import {
  LucideLoader2,
  Upload,
  Send,
  Bot,
  SearchX,
  FileText,
  FilesIcon,
  AlertCircle,
  Trash2,
  Database,
  BookOpen,
} from "lucide-react";
import { formatDate, truncateText } from "~/lib/utils";

type FileInfo = {
  id: string;
  name: string;
  uploadDate: string;
};

type FilesResponse = {
  files: FileInfo[];
};

type UploadResponse = {
  fileId: string;
  fileName: string;
  uploadDate: string;
};

type QueryResponse = {
  answer: string;
  context: string[];
};

export default function RagPage() {
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("document.pdf");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    {
      id: string;
      role: "user" | "system";
      content: string;
      contexts?: string[];
      isError?: boolean;
    }[]
  >([]);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  // Reset messages when file change
  useEffect(() => {
    if (selectedFile) {
      setMessages([
        {
          id: "welcome",
          role: "system",
          content: `I'm ready to answer questions about "${selectedFile.name}". What would you like to know?`,
        },
      ]);
      setQuery("");
    } else {
      setMessages([]);
    }
  }, [selectedFile?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const response = await api.get<FilesResponse>("/api/rag/files");

      if (response.success && response.data?.files) {
        const sortedFiles = response.data.files.sort((a, b) => {
          return (
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          );
        });
        setFiles(sortedFiles);
      } else {
        toast.error("Failed to fetch files");
      }
    } catch (error: any) {
      console.error("Error fetching files:", error);
      toast.error(error.message || "Failed to fetch files");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSelectFile = (fileId: string, fileName: string) => {
    if (fileId && fileName) {
      setSelectedFile({ id: fileId, name: fileName });
    } else {
      setSelectedFile(null);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      setIsDeleting(fileId);
      const response = await api.post("/api/rag/delete", { fileId });

      if (response.success) {
        toast.success("File deleted successfully");
        setFiles((prev) => prev.filter((file) => file.id !== fileId));

        if (selectedFile?.id === fileId) {
          setSelectedFile(null);
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

  const handleTextExtracted = (text: string, filename?: string) => {
    setExtractedText(text);
    if (filename) setFileName(filename);
    toast.success("Text successfully extracted!");
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!extractedText) {
      toast.error("Please extract text from a document first");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create request data
      const data = {
        fileName: fileName,
        extractedText: extractedText,
      };

      // Send request
      const response = await api.post<UploadResponse>("/api/rag/upload", data, {
        timeout: 30000, // 30 second timeout
      });

      if (response.success) {
        toast.success("Document uploaded successfully!");

        // Update the file list
        fetchFiles();

        // Select the new file
        if (response.data?.fileId && response.data?.fileName) {
          handleSelectFile(response.data.fileId, response.data.fileName);
        }

        setExtractedText("");
      } else {
        throw new Error(
          (response as any).error?.[0]?.message || "Upload failed",
        );
      }
    } catch (error: any) {
      console.error("Upload error:", error);

      let errorMessage = "Failed to upload document";
      if (error.name === "AbortError" || error.code === "ETIMEDOUT") {
        errorMessage = "Upload timed out. The document may be too large.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!query.trim() || isSearching || !selectedFile) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsSearching(true);

    const searchTimeout = setTimeout(() => {
      if (isSearching) {
        setIsSearching(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            content:
              "The search took too long and was automatically canceled. Please try a more specific question.",
            isError: true,
          },
        ]);
      }
    }, 20000); // 20 sec

    try {
      const response = await api.post<QueryResponse>(
        "/api/rag/query",
        {
          fileId: selectedFile.id,
          query: userMessage.content,
        },
        {
          timeout: 15000, // 15 sec
        },
      );

      clearTimeout(searchTimeout);

      if (response.success) {
        const systemMessage = {
          id: (Date.now() + 1).toString(),
          role: "system" as const,
          content: response.data?.answer || "No answer found",
          contexts: response.data?.context || [],
        };
        setMessages((prev) => [...prev, systemMessage]);
      } else {
        throw new Error(
          (response as any).error?.[0]?.message || "Failed to get answer",
        );
      }
    } catch (error: any) {
      clearTimeout(searchTimeout);
      console.error("Query error:", error);

      const errorMessage =
        error.name === "AbortError" || error.code === "ETIMEDOUT"
          ? "The search timed out. Please try a more specific question."
          : "Error searching the document. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: errorMessage,
          isError: true,
        },
      ]);

      toast.error("Search error");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-background flex h-[calc(100vh-100px)] w-full flex-col">
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="flex w-1/3 flex-col">
          <Tabs defaultValue="upload" className="flex h-full flex-col">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>

            <TabsContent
              value="upload"
              className="flex flex-1 flex-col overflow-hidden"
            >
              <Card className="flex flex-1 flex-col overflow-hidden">
                <CardContent className="scrollbar flex-1 overflow-y-auto p-4">
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

                  <div className="mb-4">
                    <FileTextExtractor
                      setExtractedText={(text: string, filename?: string) =>
                        handleTextExtracted(text, filename || fileName)
                      }
                      label="Select a PDF, DOCX, or XLSX document"
                    />
                  </div>

                  {extractedText && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium">
                            Extracted text:
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
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload Document
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="relative">
                        <div className="bg-primary/10 absolute -left-4 h-full w-1 rounded-full"></div>
                        <div className="bg-muted/30 scrollbar max-h-56 overflow-y-auto rounded-md border p-3 text-sm">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="flex-1 overflow-hidden">
              <Card className="flex h-full flex-col">
                <CardContent className="flex flex-1 flex-col overflow-hidden p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Database className="h-4 w-4" />
                        Your Documents
                      </h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchFiles}
                      disabled={isLoadingFiles}
                    >
                      Refresh
                    </Button>
                  </div>

                  <div className="scrollbar flex-1 overflow-y-auto p-2">
                    {isLoadingFiles ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground flex items-center gap-2 text-sm">
                          <span className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                          Loading files...
                        </p>
                      </div>
                    ) : files.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <FilesIcon className="text-muted-foreground/50 h-10 w-10" />
                        <p className="text-muted-foreground text-sm">
                          No documents found in database
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div
                            key={file.id}
                            className={`flex items-center justify-between rounded-md p-2 ${
                              selectedFile?.id === file.id
                                ? "bg-primary/10 ring-primary ring-1"
                                : "hover:bg-muted"
                            }`}
                          >
                            <button
                              onClick={() =>
                                handleSelectFile(file.id, file.name)
                              }
                              className="flex flex-1 flex-col items-start gap-1 text-left text-sm"
                              disabled={isDeleting === file.id}
                            >
                              <div className="flex w-full items-center gap-2">
                                <FilesIcon className="h-4 w-4 shrink-0" />
                                <div className="flex-1 truncate font-medium">
                                  {truncateText(file.name, 24)}
                                </div>
                              </div>
                              <div className="text-muted-foreground pl-6 text-xs">
                                {formatDate(file.uploadDate)}
                              </div>
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:bg-red-100 hover:text-red-700"
                              onClick={() => deleteFile(file.id)}
                              disabled={isDeleting === file.id}
                            >
                              {isDeleting === file.id ? (
                                <LucideLoader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex w-2/3 flex-col">
          <Card className="flex flex-1 flex-col overflow-hidden border">
            {selectedFile ? (
              <>
                <div className="flex items-center gap-3 border-b px-4 pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full">
                    <Bot className="text-primary h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold">
                      Chat with - {selectedFile.name}
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Data is stored in Pinecone vectorDB and processed by
                      langchain
                    </p>
                  </div>
                </div>

                <div className="scrollbar flex-1 overflow-y-auto p-4">
                  <div className="space-y-6">
                    {messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                        <FileText className="text-muted-foreground/50 mb-3 h-12 w-12" />
                        <p className="text-muted-foreground">
                          Ask a question about &quot;
                          {truncateText(selectedFile.name)}&quot; to get started
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[90%] rounded-lg px-4 py-3 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : message.isError
                                  ? "border border-red-200 bg-red-100 dark:border-red-800 dark:bg-red-900/20"
                                  : "bg-muted"
                            }`}
                          >
                            {message.isError && (
                              <div className="mb-2 flex items-center gap-2">
                                <SearchX className="h-4 w-4 text-red-500" />
                                <span className="text-xs font-medium text-red-500">
                                  Search Error
                                </span>
                              </div>
                            )}

                            <p className="text-sm">{message.content}</p>

                            {message.contexts &&
                              message.contexts.length > 0 && (
                                <div className="mt-3">
                                  <details className="text-xs">
                                    <summary className="hover:text-primary cursor-pointer font-medium transition-colors">
                                      View source context
                                    </summary>
                                    <div className="scrollbar mt-2 max-h-40 space-y-2 overflow-y-auto pr-2">
                                      {message.contexts.map(
                                        (context, index) => (
                                          <div
                                            key={index}
                                            className="bg-background/50 rounded border p-2 text-xs"
                                          >
                                            {context}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </details>
                                </div>
                              )}
                          </div>
                        </div>
                      ))
                    )}

                    {isSearching && (
                      <div className="flex justify-start">
                        <div className="bg-muted flex items-center gap-2 rounded-lg px-4 py-3">
                          <LucideLoader2 className="h-4 w-4 animate-spin" />
                          <p className="text-sm">Searching document...</p>
                        </div>
                      </div>
                    )}
                    {/* auto-scroll */}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="border-t p-3">
                  <div className="relative flex gap-2">
                    <Input
                      className="pr-12"
                      placeholder="Ask a question about the document..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSendMessage();
                        }
                      }}
                      disabled={isSearching}
                    />
                    <Button
                      className="absolute right-0 rounded-l-none"
                      onClick={handleSendMessage}
                      disabled={!query.trim() || isSearching}
                    >
                      {isSearching ? (
                        <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {isSearching ? "Searching..." : "Send"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <div className="max-w-sm">
                  <FileText className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">
                    No document selected
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Upload a document or select an existing one from the
                    &quot;Manage&quot; tab to start asking questions
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const manageTab = document.querySelector(
                        '[data-state="inactive"][value="manage"]',
                      ) as HTMLElement;
                      manageTab?.click();
                    }}
                  >
                    View Documents
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
