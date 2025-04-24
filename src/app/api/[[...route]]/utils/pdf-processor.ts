import { v4 as uuidv4 } from "uuid";
import { storeDocumentInPinecone } from "./pinecone-store";

interface FileData {
  id: string;
  name: string;
  content: string;
  uploadDate: Date;
}

// Keep track of file metadata (but not embeddings)
const uploadedFiles = new Map<string, FileData>();

export const processPdfText = async (
  fileName: string,
  textContent: string,
): Promise<FileData> => {
  try {
    const fileId = uuidv4();

    console.log(`Processing document: ${fileName} with ID: ${fileId}`);

    const fileData: FileData = {
      id: fileId,
      name: fileName,
      content: textContent,
      uploadDate: new Date(),
    };

    // Store file metadata locally
    uploadedFiles.set(fileId, fileData);

    // Store document embeddings in Pinecone - pass the fileName as well
    await storeDocumentInPinecone(textContent, fileId, fileName);

    return fileData;
  } catch (error: any) {
    console.error("Error processing PDF text:", error);
    throw new Error(`Failed to process PDF text: ${error.message}`);
  }
};

export const getFileById = (fileId: string): FileData | undefined => {
  return uploadedFiles.get(fileId);
};

export const getAllFiles = (): FileData[] => {
  return Array.from(uploadedFiles.values());
};
