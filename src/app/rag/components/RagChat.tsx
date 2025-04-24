import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LucideLoader2, Send, Bot, SearchX, FileText } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/lib/api";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "system";
  content: string;
  contexts?: string[];
  isError?: boolean;
}

interface RagChatProps {
  fileId: string;
  fileName: string;
}

export const RagChat = ({ fileId, fileName }: RagChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: `I'm ready to answer questions about "${fileName}". What would you like to know?`,
      },
    ]);
    setQuery("");
    setIsLoading(false);
    setRetryCount(0);
  }, [fileId, fileName]);

  const handleSendMessage = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    const searchTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
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
    }, 30000); // 30 second timeout

    try {
      // Set longer timeout for query requests
      const response = await api.post<{ answer: string; context: string[] }>(
        "/api/rag/query",
        {
          fileId,
          query: userMessage.content,
        },
        {
          timeout: 25000, // 25 second timeout
        },
      );

      // Clear the timeout as we got a response
      clearTimeout(searchTimeout);

      if (response.success) {
        const systemMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: response.data.answer,
          contexts: response.data.context,
        };
        setMessages((prev) => [...prev, systemMessage]);
        setRetryCount(0); // Reset retry count on success
        setIsLoading(false);
      } else {
        throw new Error("Failed to get answer");
      }
    } catch (error: any) {
      // Clear the timeout as we got an error
      clearTimeout(searchTimeout);
      console.error("Query error:", error);

      const errorMessage =
        error.name === "AbortError" || error.code === "ETIMEDOUT"
          ? "The search timed out. Please try a more specific question."
          : "I encountered an issue searching this document. I'll try an alternative method.";

      toast.error("Search error. Using fallback method if available.");

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: errorMessage,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);

      // Only retry once to avoid infinite loops
      if (retryCount < 1) {
        setRetryCount((prev) => prev + 1);

        // Try again with a short delay
        const retryTimeout = setTimeout(async () => {
          try {
            const retryResponse = await api.post<{
              answer: string;
              context: string[];
            }>(
              "/api/rag/query",
              {
                fileId,
                query: userMessage.content,
              },
              {
                timeout: 20000, // 20 second timeout for retry
              },
            );

            if (retryResponse.success) {
              const retryMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: "system",
                content: retryResponse.data.answer,
                contexts: retryResponse.data.context,
              };
              setMessages((prev) => [...prev, retryMessage]);
            } else {
              throw new Error("Retry failed");
            }
          } catch (retryError) {
            console.error("Retry error:", retryError);
            const finalErrorMessage: Message = {
              id: (Date.now() + 3).toString(),
              role: "system",
              content:
                "I couldn't find relevant information to answer your question. This could be because the document doesn't contain the answer or there was an issue with the search. Please try a different question.",
              isError: true,
            };
            setMessages((prev) => [...prev, finalErrorMessage]);
          } finally {
            setIsLoading(false);
          }
        }, 1000);

        // Set another timeout to cancel the retry if it takes too long
        setTimeout(() => {
          clearTimeout(retryTimeout);
          if (isLoading) {
            setIsLoading(false);
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "system",
                content:
                  "The search retry was canceled due to timeout. Please try again later.",
                isError: true,
              },
            ]);
          }
        }, 22000); // 22 seconds (slightly longer than the retry timeout)

        return;
      } else {
        // Max retries reached
        const finalErrorMessage: Message = {
          id: (Date.now() + 3).toString(),
          role: "system",
          content:
            "I couldn't successfully search this document. There might be an issue with how it was processed or indexed.",
          isError: true,
        };
        setMessages((prev) => [...prev, finalErrorMessage]);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
          <Bot className="text-primary h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">
            Chat with &quot;{fileName}&quot;
          </h3>
          <p className="text-muted-foreground text-xs">
            Data is stored in Pinecone vector database and retrieved using
            LangChain
          </p>
        </div>
      </div>

      <Card className="flex-1 border shadow-sm">
        <div className="h-[500px] overflow-y-auto p-6">
          <div className="space-y-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <FileText className="text-muted-foreground/50 mb-3 h-12 w-12" />
                <p className="text-muted-foreground">
                  Ask a question about &quot;{fileName}&quot; to get started
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
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

                    {message.contexts && message.contexts.length > 0 && (
                      <div className="mt-3">
                        <details className="text-xs">
                          <summary className="hover:text-primary cursor-pointer font-medium transition-colors">
                            View source context
                          </summary>
                          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-2">
                            {message.contexts.map((context, index) => (
                              <div
                                key={index}
                                className="bg-background/50 rounded border p-2 text-xs"
                              >
                                {context}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted flex items-center gap-2 rounded-lg px-4 py-3">
                  <LucideLoader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Searching document...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-4">
        <div className="relative flex gap-2">
          <Input
            className="py-6 pr-12"
            placeholder="Ask a question about the document..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            disabled={isLoading}
          />
          <Button
            className="absolute right-0 rounded-l-none py-6"
            onClick={handleSendMessage}
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? (
              <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
