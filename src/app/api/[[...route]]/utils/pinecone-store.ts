import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

// Configuration constants
const MAX_CHUNK_SIZE = 30000;
const BATCH_SIZE = 25; // Smaller batch size to avoid rate limits
const EMBEDDING_DELAY = 300; // Delay between embedding requests
const BATCH_DELAY = 1000; // Delay between batch uploads

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

// Use the existing index created in Pinecone console
const INDEX_NAME = "lang-chain";
const NAMESPACE = "rag-docs";

// Initialize Gemini embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "embedding-001", // Using the stable model name
});

// Define metadata structure
interface ChunkMetadata {
  fileId: string;
  fileName: string; // Required field, not optional
  chunkIndex: number;
  pageNumbers?: string[];
  text?: string;
  uploadDate: string;
}

// Local vector store for fallback
const localVectorStore = new Map<
  string,
  { id: string; values: number[]; metadata: ChunkMetadata }[]
>();

// Document info cache to avoid duplicate queries
const documentInfoCache = new Map<
  string,
  { id: string; name: string; uploadDate: string }
>();

// Helper to chunk document content respecting the embedding model limits
async function chunkDocument(
  text: string,
  fileId: string,
  fileName: string,
): Promise<Document<ChunkMetadata>[]> {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  // Ensure fileName is never empty
  const safeFileName = fileName || `Document-${fileId.slice(0, 8)}`;

  // Create initial document with metadata
  const baseDocument = new Document({
    pageContent: text,
    metadata: {
      fileId,
      fileName: safeFileName,
      uploadDate: new Date().toISOString(),
    },
  });

  const initialChunks = await textSplitter.splitDocuments([baseDocument]);
  const finalChunks: Document<ChunkMetadata>[] = [];

  let currentChunk = "";
  const currentMetadata: ChunkMetadata = {
    fileId,
    fileName: safeFileName,
    chunkIndex: 0,
    uploadDate: new Date().toISOString(),
  };

  for (let i = 0; i < initialChunks.length; i++) {
    const chunk = initialChunks[i];

    // If adding this chunk exceeds the limit, save current and start new
    if ((currentChunk + chunk.pageContent).length > MAX_CHUNK_SIZE) {
      if (currentChunk.length > 0) {
        finalChunks.push(
          new Document({
            pageContent: currentChunk,
            metadata: {
              ...currentMetadata,
              chunkIndex: finalChunks.length,
            },
          }),
        );
      }

      // Start a new chunk
      currentChunk = chunk.pageContent;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + chunk.pageContent;
    }
  }

  // Add the final chunk if it's not empty
  if (currentChunk.length > 0) {
    finalChunks.push(
      new Document({
        pageContent: currentChunk,
        metadata: {
          ...currentMetadata,
          chunkIndex: finalChunks.length,
        },
      }),
    );
  }

  console.log(`Chunked document into ${finalChunks.length} pieces`);
  return finalChunks;
}

// Helper to create batches for bulk upsert
function createBatches<T>(items: T[], batchSize: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / batchSize) }, (_, i) =>
    items.slice(i * batchSize, (i + 1) * batchSize),
  );
}

// Pad embedding to match index dimensions
function padEmbedding(
  embedding: number[],
  targetDimension: number = 1024,
): number[] {
  if (embedding.length >= targetDimension) {
    return embedding.slice(0, targetDimension);
  }
  return [
    ...embedding,
    ...new Array(targetDimension - embedding.length).fill(0),
  ];
}

// Retry function for API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
      if (i < maxRetries - 1) {
        // Exponential backoff
        const waitTime = delay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
}

// Store document info in cache for faster retrieval
function cacheDocumentInfo(
  fileId: string,
  fileName: string,
  uploadDate: string,
): void {
  documentInfoCache.set(fileId, {
    id: fileId,
    name: fileName,
    uploadDate: uploadDate,
  });
}

// Store document chunks in Pinecone
export async function storeDocumentInPinecone(
  text: string,
  fileId: string,
  fileName?: string,
): Promise<void> {
  // Ensure we have a valid file name
  const safeFileName = fileName || `Document-${fileId.slice(0, 8)}`;
  const uploadDate = new Date().toISOString();

  console.log(
    `Creating vector embeddings for document: ${safeFileName} (${fileId})`,
  );

  try {
    // Cache document info for later retrieval
    cacheDocumentInfo(fileId, safeFileName, uploadDate);

    // Chunk the document
    const chunks = await chunkDocument(text, fileId, safeFileName);
    const records = [];

    // Process chunks in smaller batches
    const chunkBatches = createBatches(chunks, 3);

    for (const batch of chunkBatches) {
      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i];
        const chunkIndex = chunks.indexOf(chunk);
        console.log(
          `Generating embedding for chunk ${chunkIndex + 1}/${chunks.length}`,
        );

        try {
          // Generate embedding vector with retry
          const embedding = await withRetry(
            () => embeddings.embedQuery(chunk.pageContent),
            3,
            1000,
          );

          const paddedEmbedding = padEmbedding(embedding);

          // Create record with guaranteed metadata
          records.push({
            id: `${fileId}-chunk-${chunkIndex}`,
            values: paddedEmbedding,
            metadata: {
              fileId,
              fileName: safeFileName,
              chunkIndex,
              text: chunk.pageContent.slice(0, 1000),
              uploadDate,
            },
          });

          // Add delay between embedding requests
          if (i < batch.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, EMBEDDING_DELAY),
            );
          }
        } catch (error) {
          console.error(
            `Error generating embedding for chunk ${chunkIndex}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // Add delay between batches
      await new Promise((resolve) => setTimeout(resolve, EMBEDDING_DELAY * 2));
    }

    if (records.length === 0) {
      throw new Error("Failed to generate any valid embeddings");
    }

    // Try to use Pinecone if available
    try {
      console.log(`Connecting to Pinecone index: ${INDEX_NAME}`);
      const index = pinecone.Index(INDEX_NAME);

      // Check if we can connect to the index by getting stats
      await index.describeIndexStats();
      console.log("Successfully connected to Pinecone index");

      // Create batches for bulk upsert
      const batches = createBatches(records, BATCH_SIZE);

      // Upsert batches sequentially
      for (let i = 0; i < batches.length; i++) {
        console.log(`Upserting batch ${i + 1}/${batches.length}`);

        await withRetry(
          () => index.namespace(NAMESPACE).upsert(batches[i]),
          3,
          2000,
        );

        // Add delay between batch requests
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

      console.log(
        `Successfully stored document ${safeFileName} (${fileId}) in Pinecone`,
      );
    } catch (error) {
      console.error(
        "Failed to use Pinecone, falling back to local storage:",
        error,
      );

      // Fallback to local storage
      console.log(`Storing vectors locally for file ${fileId}`);
      localVectorStore.set(fileId, records);
      console.log(`Successfully stored document ${safeFileName} locally`);
    }
  } catch (error) {
    console.error(
      "Error processing document:",
      error instanceof Error ? error.message : String(error),
    );
    throw new Error(
      `Failed to process document: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Query the vector store
export async function queryPineconeStore(
  query: string,
  fileId: string,
): Promise<string[]> {
  console.log(`Searching for: "${query}" in document ${fileId}`);

  try {
    // Get document info from cache if available
    const docInfo = documentInfoCache.get(fileId);
    if (docInfo) {
      console.log(`Using cached document info: ${docInfo.name}`);
    }

    // Get the embedding for the query
    const queryEmbedding = await withRetry(
      () => embeddings.embedQuery(query),
      3,
      1000,
    );

    // Pad embedding to match index dimensions
    const paddedEmbedding = padEmbedding(queryEmbedding);

    try {
      // Try to use Pinecone if available
      console.log("Connecting to Pinecone for query...");
      const index = pinecone.Index(INDEX_NAME);

      // Check connection by getting stats
      const stats = await index.describeIndexStats();
      if (!stats.namespaces?.[NAMESPACE]) {
        console.log("Namespace not found in Pinecone");
        throw new Error("Namespace not found");
      }

      // Query Pinecone namespace with fileId filter
      console.log(`Querying Pinecone for fileId: ${fileId}`);

      const queryResults = await withRetry(
        () =>
          index.namespace(NAMESPACE).query({
            vector: paddedEmbedding,
            topK: 5,
            includeMetadata: true,
            filter: { fileId: { $eq: fileId } },
          }),
        3,
        1000,
      );

      console.log(`Found ${queryResults.matches.length} matches in Pinecone`);

      // If we found results but don't have the doc in cache, update the cache
      if (queryResults.matches.length > 0 && !docInfo) {
        const firstMatch = queryResults.matches[0];
        if (firstMatch.metadata?.fileName && firstMatch.metadata?.fileId) {
          cacheDocumentInfo(
            firstMatch.metadata.fileId as string,
            firstMatch.metadata.fileName as string,
            (firstMatch.metadata.uploadDate as string) ||
              new Date().toISOString(),
          );
        }
      }

      // Extract text from the matches
      const relevantChunks = queryResults.matches
        .filter((match: any) => match.metadata?.text)
        .map((match: any) => match.metadata?.text as string);

      if (relevantChunks.length === 0) {
        return ["No relevant information found in the document."];
      }

      return relevantChunks;
    } catch (error) {
      console.error("Pinecone query error:", error);

      // Fallback to local storage
      console.log("Falling back to local storage for query");

      if (!localVectorStore.has(fileId)) {
        return ["No data found for this document."];
      }

      const records = localVectorStore.get(fileId) || [];

      // Compute cosine similarity with each vector
      const results = records.map((record) => {
        const similarity = cosineSimilarity(paddedEmbedding, record.values);
        return {
          ...record,
          score: similarity,
        };
      });

      // Sort by similarity score (descending)
      results.sort((a, b) => b.score - a.score);

      // Take top 5 results
      const topResults = results.slice(0, 5);

      // Extract text from metadata
      return topResults.map((result) => result.metadata.text || "");
    }
  } catch (error) {
    console.error(
      "Error during search:",
      error instanceof Error ? error.message : String(error),
    );
    return ["Error searching the document. Please try again."];
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const minLength = Math.min(a.length, b.length);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minLength; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Delete all vectors associated with a fileId
export async function deletePineconeVectors(fileId: string): Promise<boolean> {
  console.log(`Deleting vectors for file ${fileId}`);

  try {
    // Remove from cache
    documentInfoCache.delete(fileId);

    // First, try to delete from Pinecone
    try {
      console.log(
        `Connecting to Pinecone to delete vectors for file: ${fileId}`,
      );
      const index = pinecone.Index(INDEX_NAME);

      // Delete vectors with fileId from the namespace
      await withRetry(
        () =>
          index.namespace(NAMESPACE).deleteMany({ fileId: { $eq: fileId } }),
        3,
        1000,
      );

      console.log(
        `Successfully deleted vectors for file ${fileId} from Pinecone`,
      );
    } catch (error) {
      console.warn("Failed to delete from Pinecone:", error);
    }

    // Also delete from local storage
    localVectorStore.delete(fileId);
    console.log(
      `Successfully deleted vectors for file ${fileId} from local storage`,
    );

    return true;
  } catch (error) {
    console.error(
      "Error deleting vectors:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

// Function to list all documents stored in Pinecone
export async function listPineconeDocuments(): Promise<
  {
    id: string;
    name: string;
    uploadDate: string;
  }[]
> {
  try {
    console.log("Listing documents from Pinecone...");

    // First check our local cache for document info
    if (documentInfoCache.size > 0) {
      console.log(`Using ${documentInfoCache.size} cached document records`);
      return Array.from(documentInfoCache.values());
    }

    // Otherwise query Pinecone
    const index = pinecone.Index(INDEX_NAME);

    // Get index statistics
    const stats = await index.describeIndexStats();
    const namespaceStats = stats.namespaces?.[NAMESPACE];

    if (!namespaceStats || !namespaceStats.recordCount) {
      console.log("No records found in Pinecone namespace");
      return [];
    }

    console.log(
      `Found ${namespaceStats.recordCount} records in Pinecone namespace`,
    );

    // Query with zero vector to get metadata samples
    const batchSize = 100;
    const allDocuments = new Map<
      string,
      { id: string; name: string; uploadDate: string }
    >();

    const sampleResults = await index.namespace(NAMESPACE).query({
      vector: Array(1024).fill(0), // Zero vector
      topK: batchSize,
      includeMetadata: true,
    });

    // Process matches to extract unique fileIds
    sampleResults.matches.forEach((match: any) => {
      if (match.metadata?.fileId && !allDocuments.has(match.metadata.fileId)) {
        const fileName =
          match.metadata.fileName ||
          `Document-${match.metadata.fileId.slice(0, 8)}`;
        const uploadDate =
          match.metadata.uploadDate || new Date().toISOString();

        console.log(
          `Found document: ${match.metadata.fileId}, name: ${fileName}`,
        );

        // Store in our local cache as well
        const docInfo = {
          id: match.metadata.fileId,
          name: fileName,
          uploadDate: uploadDate,
        };

        allDocuments.set(match.metadata.fileId, docInfo);
        documentInfoCache.set(match.metadata.fileId, docInfo);
      }
    });

    // Convert to array and sort by upload date (newest first)
    const documents = Array.from(allDocuments.values());
    documents.sort((a, b) => {
      const dateA = new Date(a.uploadDate).getTime();
      const dateB = new Date(b.uploadDate).getTime();
      return dateB - dateA;
    });

    console.log(`Returning ${documents.length} unique documents from Pinecone`);
    return documents;
  } catch (error) {
    console.error("Error listing Pinecone documents:", error);

    // Fallback to local storage
    const localFiles = Array.from(localVectorStore.keys()).map((fileId) => {
      const records = localVectorStore.get(fileId) || [];
      const firstRecord = records[0];

      const docInfo = {
        id: fileId,
        name:
          firstRecord?.metadata?.fileName || `Document-${fileId.slice(0, 8)}`,
        uploadDate:
          firstRecord?.metadata?.uploadDate || new Date().toISOString(),
      };

      // Cache this info
      documentInfoCache.set(fileId, docInfo);

      return docInfo;
    });

    console.log(`Returning ${localFiles.length} documents from local storage`);
    return localFiles;
  }
}
