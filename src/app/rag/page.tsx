"use client";

import { useState } from "react";
import { PdfUploader } from "./components/PdfUploader";
import { RagChat } from "./components/RagChat";
import { FileManager } from "./components/FileManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export default function RagPage() {
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleSelectFile = (fileId: string, fileName: string) => {
    if (fileId && fileName) {
      setSelectedFile({ id: fileId, name: fileName });
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadSuccess = (fileId: string, fileName: string) => {
    handleSelectFile(fileId, fileName);
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 pt-4">
              <PdfUploader onUploadSuccess={handleUploadSuccess} />
            </TabsContent>

            <TabsContent value="manage" className="pt-4">
              <FileManager
                onSelectFile={handleSelectFile}
                selectedFileId={selectedFile?.id || null}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-2">
          {selectedFile ? (
            <RagChat fileId={selectedFile.id} fileName={selectedFile.name} />
          ) : (
            <div className="flex h-[600px] flex-col items-center justify-center rounded-lg border-2 border-dashed">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-medium">
                  No document selected
                </h3>
                <p className="text-muted-foreground text-sm">
                  Upload a PDF or select an existing document to start asking
                  questions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
