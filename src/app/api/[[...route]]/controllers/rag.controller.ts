import { Context } from "hono";
import {
  queryPineconeStore,
  listPineconeDocuments,
  deletePineconeVectors,
  storeDocumentInPinecone,
} from "../utils/vectorDB/vector-store";
import { success, err } from "../utils/response";
import { llm } from "../utils/llm";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const uploadPdf = async (c: Context) => {
  try {
    const { fileName, extractedText } = await c.req.json();

    if (!fileName || !extractedText) {
      return c.json(err("File name and extracted text are required"), 400);
    }

    const processPdfText = async (fileName: string, extractedText: string) => {
      const fileId = crypto.randomUUID();
      try {
        await storeDocumentInPinecone(extractedText, fileId, fileName);

        return {
          id: fileId,
          name: fileName,
          uploadDate: new Date(),
        };
      } catch (error: any) {
        console.error("Error processing PDF text:", error);
        throw new Error(`Failed to process PDF text: ${error.message}`);
      }
    };

    const fileData = await processPdfText(fileName, extractedText);

    return c.json(
      success({
        fileId: fileData.id,
        fileName: fileData.name,
        uploadDate: fileData.uploadDate,
      }),
    );
  } catch (error: any) {
    console.error("Error in uploadPdf:", error);
    return c.json(err(`Error: ${error.message}`), 500);
  }
};

export const queryPdf = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { fileId, query } = body;

    if (!fileId || !query) {
      return c.json(err("Missing fileId or query in request body"), 400);
    }

    const contexts = await queryPineconeStore(query, fileId);

    const hasError =
      contexts.length === 1 &&
      (contexts[0].includes("Error searching the document") ||
        contexts[0].includes("Vector dimension mismatch") ||
        contexts[0].includes("dimension of the index"));

    if (hasError) {
      return c.json(err("Unexpected error. Please try again later."), 500);
    }

    // LLM response on the context to the query
    try {
      const contextText = contexts.join("\n\n");
      const promptMessages = [
        new SystemMessage(
          "You are an AI assistant that answers questions based on the provided context. " +
            "Be concise and factual. Only answer what is supported by the context. " +
            "If the answer is not in the context, say you don't have enough information.",
        ),
        new HumanMessage(
          `Context information is below:\n\n${contextText}\n\nQuestion: ${query}\n\nAnswer:`,
        ),
      ];

      const response = await llm.invoke(promptMessages);
      const answer = response.content.toString();

      return c.json(
        success({
          answer: answer,
          context: contexts,
        }),
      );
    } catch (llmError) {
      console.error("LLM error:", llmError);
      return c.json(
        success({
          answer: `Based on the document, I found the following information:`,
          context: contexts,
        }),
      );
    }
  } catch (error: any) {
    console.error("Error in queryPdf:", error);
    return c.json(
      err(`Failed to query document. Please try again later.`),
      500,
    );
  }
};

export const listFiles = async (c: Context) => {
  try {
    const files = await listPineconeDocuments();

    return c.json(
      success({
        files,
      }),
    );
  } catch (error: any) {
    console.error("Error in listFiles:", error);

    return c.json(err(`Error: ${error.message}`), 500);
  }
};

export const removeFile = async (c: Context) => {
  try {
    const { fileId } = await c.req.json();

    if (!fileId) {
      return c.json(err("File ID is required"), 400);
    }

    const isDeleted = await deletePineconeVectors(fileId);

    if (!isDeleted) {
      return c.json(err("Failed to delete file"), 500);
    }

    return c.json(
      success({
        message: "File deleted successfully",
      }),
    );
  } catch (error: any) {
    console.error("Error in removeFile:", error);
    return c.json(err(`Failed to remove file. Please try again later.`), 500);
  }
};
