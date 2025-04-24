import { Context } from "hono";
import { err, success } from "../utils/response";
import {
  processPdfText,
  getFileById,
  getAllFiles,
} from "../utils/pdf-processor";
import {
  queryPineconeStore,
  listPineconeDocuments,
} from "../utils/pinecone-store";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../utils/llm";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const uploadPdf = async (c: Context) => {
  try {
    const { fileName, extractedText } = await c.req.json();

    if (!fileName || !extractedText) {
      return c.json(err("File name and extracted text are required"), 400);
    }

    const fileData = await processPdfText(fileName, extractedText);
    return c.json(
      success({
        fileId: fileData.id,
        fileName: fileData.name,
        uploadDate: fileData.uploadDate,
      }),
    );
  } catch (error: any) {
    console.error("Error uploading PDF:", error);
    return c.json(err(`Failed to upload PDF: ${error.message}`), 500);
  }
};

export const queryPdf = async (c: Context) => {
  // Set a timeout for the entire operation
  let isTimedOut = false;
  const operationTimeout = setTimeout(() => {
    isTimedOut = true;
  }, 20000); // 20 second timeout

  try {
    const { fileId, query } = await c.req.json();

    if (!fileId || !query) {
      clearTimeout(operationTimeout);
      return c.json(err("Missing fileId or query in request body"), 400);
    }

    // Try to get file metadata first
    const fileData = getFileById(fileId);

    // Check for timeout
    if (isTimedOut) {
      return c.json(
        success({
          answer:
            "The operation timed out. Please try a more specific question.",
          context: [],
        }),
      );
    }

    // Get relevant document chunks from vector store with timeout control
    const relevantChunksPromise = queryPineconeStore(query, fileId);

    // Add a race with a timeout
    const timeoutPromise = new Promise<string[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Vector search timed out"));
      }, 15000); // 15 second timeout for vector search
    });

    // Race between the actual query and the timeout
    let relevantChunks;
    try {
      relevantChunks = await Promise.race([
        relevantChunksPromise,
        timeoutPromise,
      ]);
    } catch (error) {
      console.error("Vector search timed out:", error);
      clearTimeout(operationTimeout);
      return c.json(
        success({
          answer:
            "The search took too long. Please try a more specific question.",
          context: [],
        }),
      );
    }

    if (relevantChunks.length === 0) {
      clearTimeout(operationTimeout);
      return c.json(
        success({
          answer:
            "I couldn't find relevant information in the document to answer your question.",
          context: [],
        }),
      );
    }

    // Check for timeout again
    if (isTimedOut) {
      return c.json(
        success({
          answer:
            "The operation timed out while processing results. Please try a more specific question.",
          context: [],
        }),
      );
    }

    // Create a context from the relevant chunks
    const context = relevantChunks.join("\n\n");

    // Create a prompt template with the query and context
    // Add file information if available
    const documentInfo = fileData
      ? `\nThe question is about the document titled: "${fileData.name}"`
      : "";

    const promptTemplate = ChatPromptTemplate.fromTemplate(`
      You are a helpful assistant that answers questions based on the provided document context.
      
      Context from the document:
      {context}
      
      User Question: {query}${documentInfo}
      
      Answer the question based only on the provided context. If the answer isn't contained within the context, 
      say "I don't have enough information to answer this question." Be concise, accurate, and helpful.
    `);

    // Create a chain
    const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

    // Add another race with a timeout for the LLM
    const llmTimeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error("LLM processing timed out"));
      }, 10000); // 10 second timeout for LLM
    });

    let answer;
    try {
      // Invoke the chain with timeout
      answer = await Promise.race([
        chain.invoke({
          context,
          query,
        }),
        llmTimeoutPromise,
      ]);
    } catch (error) {
      console.error("LLM processing timed out:", error);
      clearTimeout(operationTimeout);
      return c.json(
        success({
          answer:
            "I found relevant information but took too long to process it. Here's the raw context instead.",
          context: relevantChunks,
        }),
      );
    }

    clearTimeout(operationTimeout);
    return c.json(
      success({
        answer,
        context: relevantChunks,
      }),
    );
  } catch (error: any) {
    console.error("Error querying document:", error);
    clearTimeout(operationTimeout);
    return c.json(err(`Failed to query document: ${error.message}`), 500);
  }
};

export const listFiles = async (c: Context) => {
  try {
    const pineconeFiles = await listPineconeDocuments();
    if (pineconeFiles.length > 0) {
      return c.json(success(pineconeFiles));
    }

    //fall back to local files method
    const files = getAllFiles().map((file) => ({
      id: file.id,
      name: file.name,
      uploadDate: file.uploadDate,
    }));

    return c.json(success(files));
  } catch (error: any) {
    console.error("Error listing files:", error);
    return c.json(err(`Failed to list files: ${error.message}`), 500);
  }
};
