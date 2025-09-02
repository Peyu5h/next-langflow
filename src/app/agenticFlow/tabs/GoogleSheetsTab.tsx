import React, { useState, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api";
import {
  LucideLoader2,
  SendHorizontal,
  Plus,
  FilePlus2,
  Download,
  Rows3,
  Pencil,
  KeyRound,
  KeySquare,
  Table,
  FileSpreadsheet,
  XCircle,
  Check,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface SheetInfo {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  title?: string;
  url?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface SheetsListResponse {
  sheets: SheetInfo[];
}

interface ChatResponseData {
  message: string;
  data?: any;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  title?: string;
}

interface SheetDataRow {
  [key: string]: string | number;
}

interface DataActionProps {
  activeSheet: SheetInfo | null;
  onAction: (action: string, params: any) => void;
  isLoading: boolean;
}

const CredentialSetup = ({
  onSuccess,
}: {
  onSuccess: (
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ) => void;
}) => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !clientSecret || !refreshToken) {
      toast.error("All fields are required");
      return;
    }

    setIsSubmitting(true);
    try {
      onSuccess(clientId, clientSecret, refreshToken);
    } catch (error: any) {
      console.error("Error saving credentials:", error);
      toast.error(error.message || "Failed to save credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <p className="text-muted-foreground mb-4 text-sm">
          You can obtain these credentials from the Google Cloud Console.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Client ID</label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your Google API Client ID"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Client Secret</label>
            <Input
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Your Google API Client Secret"
              className="mt-1"
              type="password"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Refresh Token</label>
            <Input
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="Your Google API Refresh Token"
              className="mt-1"
              type="password"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              You can obtain a refresh token by authenticating with your Google
              account and extracting it from the response.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              //   onClick={() => setShowCredentialSetup(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <KeySquare className="mr-2 h-4 w-4" />
                  Save Credentials
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const OAuthInstructions = () => {
  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <h3 className="mb-4 text-lg font-medium">
          Google OAuth Setup Instructions
        </h3>
        <div className="space-y-4 text-sm">
          <p>
            To fix the <strong>redirect_uri_mismatch</strong> error, follow
            these steps in your Google Cloud Console:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Go to{" "}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Google Cloud Console
              </a>
            </li>
            <li>Select your project</li>
            <li>
              Go to &quot;APIs &amp; Services&quot; → &quot;Credentials&quot;
            </li>
            <li>Edit your OAuth Client ID</li>
            <li>
              Under &quot;Authorized redirect URIs&quot;, make sure you have{" "}
              <strong>exactly</strong> this URI:
              <div className="my-1 rounded bg-gray-100 p-2 font-mono text-xs dark:bg-gray-800">
                http://localhost:3000/api/sheets/auth/callback
              </div>
              (adjust the domain if you&apos;re not using localhost)
            </li>
            <li>Save the changes and try again</li>
          </ol>

          <p className="mt-4 font-medium">For manual credential setup:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Create OAuth credentials in Google Cloud Console as above</li>
            <li>Note down your Client ID and Client Secret</li>
            <li>
              To get a refresh token, you can use the OAuth flow once, then
              extract the refresh token from the response, or use a tool like{" "}
              <a
                href="https://developers.google.com/oauthplayground"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                OAuth Playground
              </a>
            </li>
            <li>Enter these credentials in the form</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

const SheetDataEditor = ({
  activeSheet,
  onAction,
  isLoading,
}: DataActionProps) => {
  const [action, setAction] = useState<string>("read");
  const [instruction, setInstruction] = useState<string>("");
  const [rows, setRows] = useState<number>(5);
  const [columns, setColumns] = useState<number>(2);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [dataType, setDataType] = useState<string>("names");
  const [operation, setOperation] = useState<string>("insertRows");
  const [operationType, setOperationType] = useState<string>("structure");
  const [headerOnly, setHeaderOnly] = useState<boolean>(false);

  const getSheetName = () => {
    return "Sheet1";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeSheet?.id) {
      toast.error("No sheet selected");
      return;
    }

    const sheetName = getSheetName();
    const columnLetter = String.fromCharCode(65 + Math.min(columns - 1, 25));
    const range = `${sheetName}!A1:${columnLetter}${rows}`;

    switch (action) {
      case "read":
        onAction("read", {
          range: range,
          spreadsheetId: activeSheet.id,
        });
        break;
      case "manipulate":
        if (operationType === "structure") {
          onAction("manipulate", {
            spreadsheetId: activeSheet.id,
            operation: operation,
            startIndex: Number(startIndex),
            endIndex:
              Number(startIndex) +
              (operation?.includes("Row") ? Number(rows) : Number(columns)),
            dimension: operation?.includes("Row") ? "ROWS" : "COLUMNS",
          });
        } else if (operationType === "analyze") {
          onAction("chat", {
            message: `Analyze the data in sheet ${activeSheet.id} range ${range} with these instructions: ${instruction}`,
            spreadsheetId: activeSheet.id,
          });
        } else if (operationType === "header") {
          onAction("generateContent", {
            spreadsheetId: activeSheet.id,
            range: `${sheetName}!A1:${columnLetter}1`,
            dataType: "headers",
            instruction: instruction || `Generate ${columns} column headers`,
            rows: 1,
            columns: Number(columns),
            headerOnly: true,
          });
        } else {
          onAction("generateContent", {
            spreadsheetId: activeSheet.id,
            range: range,
            dataType: dataType,
            instruction:
              instruction ||
              `Generate ${dataType} data for ${rows} rows and ${columns} columns`,
            rows: Number(rows),
            columns: Number(columns),
            headerOnly: false,
          });
        }
        break;
      default:
        break;
    }
  };

  return (
    <Card className="mt-4 w-1/2">
      <CardContent>
        <Tabs defaultValue="read" onValueChange={setAction}>
          <TabsList className="w-full">
            <TabsTrigger value="read" className="flex-1">
              Read Data
            </TabsTrigger>
            <TabsTrigger value="manipulate" className="flex-1">
              Manipulate Sheet
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {action === "read" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rows to read</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={rows}
                    onChange={(e) => setRows(parseInt(e.target.value) || 5)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Columns to read</label>
                  <Input
                    type="number"
                    min={1}
                    max={26}
                    value={columns}
                    onChange={(e) => setColumns(parseInt(e.target.value) || 2)}
                  />
                </div>
              </div>
            )}

            {action === "manipulate" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Operation Type</label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="structure">
                      Modify Structure (Rows/Columns)
                    </option>
                    <option value="data">Generate Data</option>
                    <option value="header">Add Column Headers Only</option>
                    <option value="analyze">Analyze Sheet Data</option>
                  </select>
                </div>

                {operationType === "structure" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Operation</label>
                      <select
                        name="operation"
                        value={operation}
                        onChange={(e) => setOperation(e.target.value)}
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="insertRows">Insert Rows</option>
                        <option value="deleteRows">Delete Rows</option>
                        <option value="insertColumns">Insert Columns</option>
                        <option value="deleteColumns">Delete Columns</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Starting position
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={startIndex}
                        onChange={(e) =>
                          setStartIndex(parseInt(e.target.value) || 0)
                        }
                        placeholder="Position to insert/delete from"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {operation.includes("Row")
                          ? "Number of rows"
                          : "Number of columns"}
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={operation.includes("Row") ? 100 : 26}
                        value={operation.includes("Row") ? rows : columns}
                        onChange={(e) => {
                          if (operation.includes("Row")) {
                            setRows(parseInt(e.target.value) || 1);
                          } else {
                            setColumns(parseInt(e.target.value) || 1);
                          }
                        }}
                      />
                    </div>
                  </>
                )}

                {(operationType === "data" || operationType === "header") && (
                  <>
                    {operationType === "data" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data Type</label>
                        <select
                          value={dataType}
                          onChange={(e) => setDataType(e.target.value)}
                          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="names">Person Names</option>
                          <option value="indian_names">Indian Names</option>
                          <option value="companies">Company Names</option>
                          <option value="products">Product Data</option>
                          <option value="countries">Country Data</option>
                          <option value="numbers">Numeric Data</option>
                          <option value="dates">Date & Time</option>
                          <option value="random">Random Mixed Data</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Additional instructions (optional)
                      </label>
                      <Textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder={
                          operationType === "header"
                            ? "Describe the column headers (e.g., ID, Name, Email, etc.)"
                            : `Optional: Specific requirements for ${dataType} data`
                        }
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Columns</label>
                        <Input
                          type="number"
                          min={1}
                          max={26}
                          value={columns}
                          onChange={(e) =>
                            setColumns(parseInt(e.target.value) || 2)
                          }
                        />
                      </div>

                      {operationType === "data" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Rows</label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={rows}
                            onChange={(e) =>
                              setRows(parseInt(e.target.value) || 5)
                            }
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {operationType === "analyze" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Analysis instructions
                      </label>
                      <Textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="What would you like to know about the data? (e.g., Find average of column B, count unique values)"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Rows to analyze
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={rows}
                          onChange={(e) =>
                            setRows(parseInt(e.target.value) || 5)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Columns to analyze
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={26}
                          value={columns}
                          onChange={(e) =>
                            setColumns(parseInt(e.target.value) || 2)
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !activeSheet}
            >
              {isLoading ? (
                <>
                  <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {action === "read" && <Table className="mr-2 h-4 w-4" />}
                  {action === "manipulate" && (
                    <Rows3 className="mr-2 h-4 w-4" />
                  )}

                  {action === "read" && "Read Data"}
                  {action === "manipulate" &&
                    (operationType === "structure"
                      ? `${operation} (${operation.includes("Row") ? rows : columns})`
                      : operationType === "header"
                        ? "Add Headers"
                        : operationType === "analyze"
                          ? "Analyze Data"
                          : "Generate Data")}
                </>
              )}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const CreateSheetDialog = ({
  onCreateSheet,
  isLoading,
}: {
  onCreateSheet: (title: string) => void;
  isLoading: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreateSheet(title);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus size={16} className="mr-1" />
          Create New Sheet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Google Sheet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sheet Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter sheet title"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading ? (
                <>
                  <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Sheet"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function GoogleSheetsTab() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "Welcome to Google Sheets Agent! How can I help you today? You can ask me to create a new sheet, update an existing one, read data, or manipulate sheets.",
      timestamp: new Date(),
    },
  ]);
  const [recentSheets, setRecentSheets] = useState<SheetInfo[]>([]);
  const [activeSheet, setActiveSheet] = useState<SheetInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCredentialSetup, setShowCredentialSetup] = useState(false);
  const [showOAuthInstructions, setShowOAuthInstructions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  }>({});

  useEffect(() => {
    const cachedCredentials = localStorage.getItem("google_sheets_credentials");
    if (cachedCredentials) {
      try {
        const parsedCredentials = JSON.parse(cachedCredentials);
        setCredentials(parsedCredentials);

        if (
          parsedCredentials.clientId &&
          parsedCredentials.clientSecret &&
          parsedCredentials.refreshToken
        ) {
          validateAndUseCredentials(
            parsedCredentials.clientId,
            parsedCredentials.clientSecret,
            parsedCredentials.refreshToken,
          );
        }
      } catch (error) {
        console.error("Error parsing cached credentials:", error);
        localStorage.removeItem("google_sheets_credentials");
      }
    }
  }, []);

  const validateAndUseCredentials = async (
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ) => {
    try {
      const response = await api.post<ApiResponse>("/api/sheets/credentials", {
        clientId,
        clientSecret,
        refreshToken,
      });

      if (response.success) {
        setIsAuthenticated(true);
        refetchSheets();

        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content:
              "Successfully authenticated with Google Sheets using saved credentials!",
            timestamp: new Date(),
          },
        ]);

        const newCredentials = { clientId, clientSecret, refreshToken };
        setCredentials(newCredentials);
        localStorage.setItem(
          "google_sheets_credentials",
          JSON.stringify(newCredentials),
        );

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error validating credentials:", error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/sheets/logout");
      setCredentials({});
      setIsAuthenticated(false);
      setActiveSheet(null);
      setRecentSheets([]);
      localStorage.removeItem("google_sheets_credentials");
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "You have been logged out of Google Sheets.",
          timestamp: new Date(),
        },
      ]);

      toast.success("Successfully logged out");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out properly");
    }
  };

  const handleCredentialSuccess = async (
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ) => {
    const success = await validateAndUseCredentials(
      clientId,
      clientSecret,
      refreshToken,
    );

    if (success) {
      setShowCredentialSetup(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const {
    data: sheetsData,
    refetch: refetchSheets,
    isError,
  } = useQuery({
    queryKey: ["sheets", "list"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/sheets/list");
        const data = await response.json();
        setApiError(null); // Clear any previous errors

        console.log("Sheets API response:", data);

        if (data?.success && Array.isArray(data?.data?.sheets)) {
          return data.data.sheets;
        } else {
          console.warn("Unexpected sheets list response format:", data);
          return [];
        }
      } catch (error: any) {
        console.error("Error fetching sheets:", error);
        const errorMessage = error.message || "Failed to fetch sheets";
        setApiError(errorMessage);
        return [];
      }
    },
    enabled: isAuthenticated,
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (sheetsData && Array.isArray(sheetsData) && sheetsData.length > 0) {
      console.log("Sheets data mapped:", sheetsData);
      setRecentSheets(
        sheetsData.map((sheet: any) => ({
          id: sheet.id || "",
          name: sheet.name || `Sheet-${sheet.id?.slice(0, 8)}`,
          url: sheet.webViewLink || "",
          title: sheet.name || `Sheet-${sheet.id?.slice(0, 8)}`,
        })),
      );
    } else {
      console.log("No sheets found or empty array received:", sheetsData);
    }
  }, [sheetsData]);

  const authMutation = useMutation({
    mutationFn: async () => {
      return api.get<ApiResponse<{ url: string }>>("/api/sheets/auth");
    },
    onSuccess: (response) => {
      const authUrl = response.data?.data?.url;
      if (authUrl) {
        const authWindow = window.open(
          authUrl,
          "Google Auth",
          "width=600,height=700",
        );

        const handleAuthMessage = (event: MessageEvent) => {
          if (event.data === "sheets-auth-success") {
            if (authWindow) authWindow.close();
            setIsAuthenticated(true);

            refetchSheets();

            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: "Successfully authenticated with Google Sheets!",
                timestamp: new Date(),
              },
            ]);

            window.removeEventListener("message", handleAuthMessage);
          }
        };

        window.addEventListener("message", handleAuthMessage);
      } else {
        toast.error("Failed to get authentication URL");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to initialize Google authentication");
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const payload = activeSheet
        ? { message: prompt, spreadsheetId: activeSheet.id }
        : { message: prompt };

      const response = await api.post("/api/sheets/chat", payload);
      return response as unknown as ApiResponse<ChatResponseData>;
    },
    onSuccess: (response) => {
      const responseData = response as unknown as ApiResponse<ChatResponseData>;
      const assistantResponse =
        responseData.data?.message || "I processed your request successfully.";

      if (responseData.data?.spreadsheetId && responseData.data?.title) {
        const newSheet: SheetInfo = {
          id: responseData.data.spreadsheetId,
          name: responseData.data.title,
          url: responseData.data.spreadsheetUrl || "",
          title: responseData.data.title,
        };

        setRecentSheets((prev) => [
          newSheet,
          ...prev.filter((s) => s.id !== newSheet.id),
        ]);
        setActiveSheet(newSheet);

        refetchSheets();
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantResponse,
          timestamp: new Date(),
        },
      ]);

      if (responseData.data?.data && Array.isArray(responseData.data.data)) {
        const tableData = responseData.data.data;

        if (tableData.length > 0) {
          let formattedTable = "";

          const columnWidths = tableData[0].map((_: any, colIndex: number) => {
            return Math.max(
              ...tableData.map((row) => {
                const cell = row[colIndex] ? String(row[colIndex]) : "";
                return cell.length;
              }),
            );
          });

          tableData.forEach((row, rowIndex) => {
            const formattedRow = row
              .map((cell: any, colIndex: number) => {
                const cellStr = cell ? String(cell) : "";
                return cellStr.padEnd(columnWidths[colIndex] + 2);
              })
              .join(" | ");

            formattedTable += formattedRow + "\n";

            if (rowIndex === 0) {
              formattedTable +=
                columnWidths
                  .map((width: number) => "-".repeat(width + 2))
                  .join("-+-") + "\n";
            }
          });

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "```\n" + formattedTable + "\n```",
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "The sheet appears to be empty.",
              timestamp: new Date(),
            },
          ]);
        }
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to process your request");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const createSheetMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await api.post("/api/sheets/create", { title });
      return response as unknown as ApiResponse<ChatResponseData>;
    },
    onSuccess: (response) => {
      const responseData = response as unknown as ApiResponse<ChatResponseData>;
      const sheetData = {
        id: responseData.data.spreadsheetId!,
        name: responseData.data.title!,
        url: responseData.data.spreadsheetUrl!,
        title: responseData.data.title!,
      };

      setRecentSheets((prev) => [sheetData, ...prev]);
      setActiveSheet(sheetData);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've created a new sheet titled "${responseData.data.title}". You can now add data to it or manipulate it.`,
          timestamp: new Date(),
        },
      ]);

      toast.success("Sheet created successfully");

      refetchSheets();
    },
    onError: (error: Error) => {
      toast.error("Failed to create sheet");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error creating your sheet. Please try again.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleAuthenticateGoogle = () => {
    setShowCredentialSetup(true);
  };

  const handleOAuthAuthenticate = () => {
    authMutation.mutate();
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: "Connecting to Google Sheets...",
        timestamp: new Date(),
      },
    ]);
  };

  const handleCreateSheet = (title: string) => {
    createSheetMutation.mutate(title);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Create a new sheet called "${title}"`,
        timestamp: new Date(),
      },
      {
        role: "assistant",
        content: `Creating a new sheet titled "${title}"...`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSelectSheet = (sheet: SheetInfo) => {
    setActiveSheet(sheet);

    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: `Selected sheet: "${sheet.name || sheet.title}"`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: message, timestamp: new Date() },
    ]);

    chatMutation.mutate(message);

    setMessage("");
  };

  const handleSheetAction = (action: string, params: any) => {
    if (!activeSheet?.id) {
      toast.error("No sheet selected");
      return;
    }

    let userQuery = "";

    switch (action) {
      case "read":
        userQuery = `Read data from sheet ${params.spreadsheetId} in range ${params.range}`;

        api
          .post("/api/sheets/read", {
            spreadsheetId: params.spreadsheetId,
            range: params.range,
          })
          .then((response: any) => {
            if (response.success) {
              const values = response.data?.values || [];

              let content = `Here's the data from ${params.range}:\n`;

              if (values.length === 0) {
                content += "The sheet appears to be empty.";
              } else {
                if (
                  values.length > 20 ||
                  values.some((row: any[]) => row.length > 5)
                ) {
                  content +=
                    "Data retrieved successfully. Displaying first rows:\n";
                  const previewRows = values.slice(0, 5);
                  content += previewRows
                    .map((row: any[]) => row.join(", "))
                    .join("\n");
                  if (values.length > 5) {
                    content += `\n... and ${values.length - 5} more rows`;
                  }
                } else {
                  content += values
                    .map((row: any[]) => row.join(", "))
                    .join("\n");
                }
              }

              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content,
                  timestamp: new Date(),
                },
              ]);
            } else {
              const errorMessage = response.message || "Unknown error occurred";
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `I had trouble reading the sheet: ${errorMessage}. Please try again.`,
                  timestamp: new Date(),
                },
              ]);
            }
          })
          .catch((error: any) => {
            const errorMessage = error?.message || "Unknown error";
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Sorry, I encountered an error reading the sheet: ${errorMessage}`,
                timestamp: new Date(),
              },
            ]);
          });

        break;

      case "chat":
        userQuery = params.message;

        api
          .post("/api/sheets/chat", {
            message: params.message,
            spreadsheetId: params.spreadsheetId,
          })
          .then((response: any) => {
            if (response.success) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: response.data?.message || "Analysis complete",
                  timestamp: new Date(),
                },
              ]);
            } else {
              const errorMessage = response.message || "Unknown error occurred";
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `I had trouble analyzing the data: ${errorMessage}. Please try again.`,
                  timestamp: new Date(),
                },
              ]);
            }
          })
          .catch((error: any) => {
            const errorMessage = error?.message || "Unknown error";
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Sorry, I encountered an error analyzing the data: ${errorMessage}`,
                timestamp: new Date(),
              },
            ]);
          });

        break;

      case "generateContent":
        userQuery = `Generate ${params.dataType} data in sheet ${params.spreadsheetId}, range ${params.range} with instructions: ${params.instruction || "no specific instructions"}`;

        api
          .post("/api/sheets/generate", {
            spreadsheetId: params.spreadsheetId,
            range: params.range,
            dataType: params.dataType,
            instruction: params.instruction,
            rows: params.rows,
            columns: params.columns,
            headerOnly: params.headerOnly || false,
          })
          .then((response: ApiResponse) => {
            if (response.success) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: params.headerOnly
                    ? `I've added headers to your sheet at ${params.range}.`
                    : `I've generated ${params.dataType} data and added it to your sheet at ${params.range}.`,
                  timestamp: new Date(),
                },
              ]);
            } else {
              const errorMessage = response.message || "Unknown error occurred";
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `I had trouble generating data for the sheet: ${errorMessage}. Please try again.`,
                  timestamp: new Date(),
                },
              ]);
            }
          })
          .catch((error: any) => {
            const errorMessage = error?.message || "Unknown error";
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Sorry, I encountered an error generating data: ${errorMessage}`,
                timestamp: new Date(),
              },
            ]);
          });

        break;

      case "manipulate":
        userQuery = `Manipulate sheet ${params.spreadsheetId} with operation: ${params.operation}`;

        api
          .post("/api/sheets/manipulate", {
            spreadsheetId: params.spreadsheetId,
            operation: params.operation,
            startIndex: params.startIndex || 0,
            endIndex:
              params.endIndex ||
              (params.startIndex || 0) +
                (params.operation.includes("Row")
                  ? params.rows
                  : params.columns),
            dimension: params.dimension,
          })
          .then((response: ApiResponse) => {
            if (response.success) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `I've successfully completed the ${params.operation} operation on your sheet.`,
                  timestamp: new Date(),
                },
              ]);
            } else {
              const errorMessage = response.message || "Unknown error occurred";
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `I had trouble manipulating the sheet: ${errorMessage}. Please try again.`,
                  timestamp: new Date(),
                },
              ]);
            }
          })
          .catch((error: any) => {
            const errorMessage = error?.message || "Unknown error";
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Sorry, I encountered an error manipulating the sheet: ${errorMessage}`,
                timestamp: new Date(),
              },
            ]);
          });
        break;

      default:
        return;
    }

    if (userQuery) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userQuery, timestamp: new Date() },
      ]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex h-[calc(100vh-240px)] gap-4 p-0">
      <div className="flex w-3/4 flex-col">
        <Card className="mb-4 flex-1 overflow-auto p-0">
          <CardContent className="flex h-full flex-col p-4">
            {showCredentialSetup ? (
              <CredentialSetup onSuccess={handleCredentialSuccess} />
            ) : showOAuthInstructions ? (
              <OAuthInstructions />
            ) : (
              <>
                {apiError && (
                  <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">API Error</span>
                    </div>
                    <p className="mt-1">{apiError}</p>
                    <div className="mt-2">
                      <a
                        href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-amber-900 underline hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-300"
                      >
                        Enable Google Drive API
                        <svg
                          className="ml-1 h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex flex-1 flex-col">
                  <div className="mb-4 min-h-[40%] flex-1 overflow-y-auto pr-2">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`mb-4 ${
                          msg.role === "user"
                            ? "ml-auto max-w-[80%]"
                            : msg.role === "system"
                              ? "mx-auto max-w-[90%] italic opacity-75"
                              : "mr-auto max-w-[80%]"
                        }`}
                      >
                        <div
                          className={`rounded-lg p-3 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : msg.role === "system"
                                ? "bg-muted text-muted-foreground text-sm"
                                : "bg-muted"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex max-h-[60%] flex-col">
                    {activeSheet && isAuthenticated && (
                      <SheetDataEditor
                        activeSheet={activeSheet}
                        onAction={handleSheetAction}
                        isLoading={chatMutation.isPending}
                      />
                    )}

                    <div className="my-4">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Ask about Google Sheets..."
                          className="h-10 flex-1"
                          disabled={!isAuthenticated}
                        />
                        <Button
                          type="submit"
                          disabled={chatMutation.isPending || !isAuthenticated}
                        >
                          {chatMutation.isPending ? (
                            <LucideLoader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SendHorizontal size={18} />
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex w-1/4 flex-col">
        <Card className="mb-4 flex-1">
          <CardContent className="p-4 py-0">
            {isAuthenticated && (
              <div className="">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleLogout()}
                >
                  Logout
                </Button>
              </div>
            )}
            <div className="mt-2">
              {activeSheet ? (
                <div className="rounded-md border p-3">
                  <h4 className="mb-1 font-medium">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <h3 className="">Active Sheet: </h3>
                      {activeSheet.name || activeSheet.title}
                    </div>
                  </h4>
                  <div className="flex">
                    <a
                      href={activeSheet.url || activeSheet.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Open in Google Sheets
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    {isAuthenticated
                      ? "No sheet selected"
                      : "Authenticate with Google Sheets first"}
                  </p>
                  {isAuthenticated ? (
                    <CreateSheetDialog
                      onCreateSheet={handleCreateSheet}
                      isLoading={createSheetMutation.isPending}
                    />
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOAuthAuthenticate}
                        className="w-full"
                        disabled={authMutation.isPending}
                      >
                        <KeyRound size={16} className="mr-1" />
                        {authMutation.isPending
                          ? "Connecting..."
                          : "Connect with OAuth"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAuthenticateGoogle}
                        className="w-full"
                      >
                        <KeySquare size={16} className="mr-1" />
                        Connect with Credentials
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 rounded-lg border p-2">
              <div className="mt-2 mb-2 flex items-center justify-between">
                <h3 className="text-xs">Available Sheets</h3>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchSheets()}
                    className="h-6 w-6 p-0"
                    title="Refresh sheets list"
                  >
                    <RefreshCcw size={16} />
                  </Button>
                )}
              </div>

              {!isAuthenticated ? (
                <div className="rounded-md border border-dashed p-3 text-center">
                  <p className="text-muted-foreground text-sm">
                    Connect to Google Sheets to see your documents
                  </p>
                </div>
              ) : isError ? (
                <div className="rounded-md border border-dashed p-3 text-center text-amber-600">
                  <p className="text-sm">
                    Unable to fetch sheets. Check API access.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchSheets()}
                    className="mt-1"
                  >
                    Try again
                  </Button>
                </div>
              ) : recentSheets.length > 0 ? (
                <div className="scrollbar max-h-[200px] space-y-2 overflow-y-auto pr-2">
                  {recentSheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className={`hover:border-primary cursor-pointer rounded-md border p-2 transition-colors ${
                        activeSheet?.id === sheet.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleSelectSheet(sheet)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium">
                          {sheet.name || sheet.title}
                        </p>
                        {activeSheet?.id === sheet.id && (
                          <Check className="text-primary h-4 w-4" />
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        ID: {sheet.id.slice(0, 12)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-center">
                  <p className="text-muted-foreground text-sm">
                    {isAuthenticated
                      ? "No sheets found"
                      : "Connect to see your sheets"}
                  </p>
                  {isAuthenticated && (
                    <CreateSheetDialog
                      onCreateSheet={handleCreateSheet}
                      isLoading={createSheetMutation.isPending}
                    />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
