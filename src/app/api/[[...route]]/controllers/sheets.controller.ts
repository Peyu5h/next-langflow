import { Context } from "hono";
import { google } from "googleapis";
import { success, err } from "../utils/response";
import { llm } from "../utils/llm";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import * as crypto from "crypto";

// Store for tokens - in production use a database
type TokenStore = {
  [key: string]: {
    refresh_token: string;
    access_token?: string;
    expiry_date?: number;
  };
};

const tokenStore: TokenStore = {};
const currentUserId = "default-user"; // In production, use actual user ID from auth

// Generate OAuth URL for Google authorization
export const getAuthUrl = async (c: Context) => {
  try {
    const state = crypto.randomBytes(20).toString("hex");

    // Use the exact same redirect URI as registered in Google Cloud Console
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sheets/auth/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
      prompt: "consent", // Force to get refresh token
      state,
    });

    return c.json(success({ url: authUrl }));
  } catch (error: any) {
    console.error("Error generating auth URL:", error);
    return c.json(err(`Failed to generate auth URL: ${error.message}`), 500);
  }
};

// Handle Google OAuth callback
export const handleGoogleCallback = async (c: Context) => {
  try {
    const code = c.req.query("code");
    const state = c.req.query("state");

    if (!code) {
      return c.json(err("No authorization code provided"), 400);
    }

    // Use the exact same redirect URI as in getAuthUrl
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sheets/auth/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return c.json(
        err(
          "No refresh token received. Please revoke access and try again with prompt=consent.",
        ),
        400,
      );
    }

    // Store tokens - in production use a database
    tokenStore[currentUserId] = {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
    };

    // Redirect back to the app or provide a close window message
    return c.html(`
      <html>
        <body>
          <h1>Authentication successful!</h1>
          <p>You can close this window now and return to the application.</p>
          <script>
            window.opener && window.opener.postMessage('sheets-auth-success', '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error handling Google callback:", error);
    return c.html(`
      <html>
        <body>
          <h1>Authentication failed</h1>
          <p>Error: ${error.message}</p>
          <p>Please try again.</p>
        </body>
      </html>
    `);
  }
};

// Set manual credentials for SaaS-like functionality
export const setCredentials = async (c: Context) => {
  try {
    const { clientId, clientSecret, refreshToken } = await c.req.json();

    if (!clientId || !clientSecret || !refreshToken) {
      return c.json(
        err("Client ID, Client Secret, and Refresh Token are all required"),
        400,
      );
    }

    // Validate credentials by attempting to use them
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sheets/auth/callback`,
    );

    // Set credentials using provided refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      // Test if credentials work by attempting to get a new access token
      await oauth2Client.getAccessToken();

      // Store the credentials
      process.env.GOOGLE_CLIENT_ID = clientId;
      process.env.GOOGLE_CLIENT_SECRET = clientSecret;
      process.env.GOOGLE_REFRESH_TOKEN = refreshToken;

      // Also store in tokenStore for consistency
      tokenStore[currentUserId] = {
        refresh_token: refreshToken,
      };

      return c.json(
        success({
          message: "Credentials validated and stored successfully",
        }),
      );
    } catch (error: any) {
      return c.json(err(`Invalid credentials: ${error.message}`), 400);
    }
  } catch (error: any) {
    console.error("Error setting credentials:", error);
    return c.json(err(`Failed to set credentials: ${error.message}`), 500);
  }
};

// Get list of user's sheets
export const getSheetsList = async (c: Context) => {
  try {
    const auth = await getAuthenticatedClient();

    // First check if the Drive API is enabled
    try {
      const drive = google.drive({
        version: "v3",
        auth,
      });

      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: "files(id, name, webViewLink, createdTime)",
        orderBy: "createdTime desc",
      });

      // Debug log to help troubleshoot
      console.log("Drive API response:", {
        files: response.data.files?.length || 0,
        status: response.status,
      });

      return c.json(
        success({
          sheets: response.data.files || [],
        }),
      );
    } catch (driveError: any) {
      // Check if it's a Google Drive API not enabled error
      if (
        (driveError.message &&
          driveError.message.includes("has not been used in project")) ||
        (driveError.message && driveError.message.includes("disabled"))
      ) {
        const projectId =
          driveError.message.match(/project\s(\d+)/)?.[1] || "your project";
        const enableUrl = `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`;

        return c.json(
          err(
            `Google Drive API is not enabled. Please enable it at ${enableUrl} and try again. After enabling, it may take a few minutes to propagate.`,
          ),
          403,
        );
      }

      // Throw other errors to be caught by the outer catch block
      throw driveError;
    }
  } catch (error: any) {
    console.error("Error listing sheets:", error);
    return c.json(err(`Failed to list sheets: ${error.message}`), 500);
  }
};

// Get authenticated client using refresh token
const getAuthenticatedClient = async () => {
  // Check if we have tokens stored
  const tokens = tokenStore[currentUserId];

  if (!tokens?.refresh_token && !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error("No refresh token available. Please authenticate first.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sheets/auth/callback`,
  );

  // Set credentials using either stored token or env var
  oauth2Client.setCredentials({
    refresh_token: tokens?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
};

// Initialize Google Sheets API client
const initGoogleSheetsClient = async () => {
  const auth = await getAuthenticatedClient();
  return google.sheets({ version: "v4", auth });
};

// Process natural language commands for Google Sheets
export const processNaturalLanguageCommand = async (c: Context) => {
  try {
    const { message, spreadsheetId } = await c.req.json();

    if (!message) {
      return c.json(err("Message is required"), 400);
    }

    // Use LLM to understand the user's intent
    const promptMessages = [
      new SystemMessage(
        "You are an AI assistant specialized in Google Sheets operations. " +
          "Analyze the user's request and determine what operation they want to perform. " +
          "Respond with a structured JSON that includes the operation type and parameters needed.",
      ),
      new HumanMessage(
        `The user wants to do something with a Google Sheet and sent this message: "${message}"
        
        If a specific sheet ID is provided, it is: ${spreadsheetId || "Not specified"}
        
        Respond with a JSON that follows this structure:
        {
          "operation": "create|read|update|manipulate|process|unknown",
          "parameters": {
            // Parameters specific to the operation
          },
          "explanation": "Brief explanation of what you determined"
        }
        
        Examples of operations:
        - create: Create a new sheet with a title
        - read: Read data from a specific range
        - update: Update cells with new values
        - manipulate: Insert/delete rows or columns
        - process: Process data with instructions
        - unknown: If you can't determine what the user wants
        
        Include only necessary parameters for the determined operation.`,
      ),
    ];

    const llmResponse = await llm.invoke(promptMessages);
    let parsedResponse;

    try {
      // Extract JSON from the response
      const jsonMatch = llmResponse.content
        .toString()
        .match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
      const jsonString = jsonMatch
        ? jsonMatch[1] || jsonMatch[0]
        : llmResponse.content.toString();
      parsedResponse = JSON.parse(
        jsonString.replace(/```json|```/g, "").trim(),
      );
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      return c.json(
        success({
          message:
            "I'm sorry, I couldn't understand how to process your request. Could you please be more specific?",
        }),
      );
    }

    // Handle operation based on LLM determination
    const { operation, parameters, explanation } = parsedResponse;

    let result;
    switch (operation) {
      case "create":
        if (parameters.title) {
          const sheets = await initGoogleSheetsClient();
          const response = await sheets.spreadsheets.create({
            requestBody: {
              properties: {
                title: parameters.title,
              },
            },
          });

          result = {
            message: `I've created a new sheet titled "${parameters.title}"`,
            spreadsheetId: response.data.spreadsheetId,
            spreadsheetUrl: response.data.spreadsheetUrl,
            title: parameters.title,
          };
        } else {
          result = {
            message:
              "I need a title to create a sheet. What would you like to call it?",
          };
        }
        break;

      case "read":
        if (!parameters.spreadsheetId && !spreadsheetId) {
          result = {
            message:
              "I need a sheet ID to read data. Could you specify which sheet you want to read from?",
          };
          break;
        }

        try {
          const sheets = await initGoogleSheetsClient();
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: parameters.spreadsheetId || spreadsheetId,
            range: parameters.range || "Sheet1!A1:Z1000",
          });

          const values = response.data.values || [];
          result = {
            message: `Here's the data from ${parameters.range || "your sheet"}:`,
            data: values,
          };
        } catch (error: any) {
          result = {
            message: `I had trouble reading that sheet: ${error.message}`,
          };
        }
        break;

      case "update":
        if (
          (!parameters.spreadsheetId && !spreadsheetId) ||
          !parameters.values
        ) {
          result = {
            message:
              "To update a sheet, I need both a sheet ID and the values to update. Could you provide these details?",
          };
          break;
        }

        try {
          const sheets = await initGoogleSheetsClient();
          await sheets.spreadsheets.values.update({
            spreadsheetId: parameters.spreadsheetId || spreadsheetId,
            range: parameters.range || "Sheet1!A1",
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: parameters.values,
            },
          });

          result = {
            message: `I've updated the values in ${parameters.range || "your sheet"}.`,
          };
        } catch (error: any) {
          result = {
            message: `I had trouble updating that sheet: ${error.message}`,
          };
        }
        break;

      case "manipulate":
        if (
          !parameters.operation ||
          (!parameters.spreadsheetId && !spreadsheetId)
        ) {
          result = {
            message:
              "To manipulate rows/columns, I need a sheet ID and the operation type (insertRows, deleteRows, insertColumns, deleteColumns).",
          };
          break;
        }

        try {
          const sheets = await initGoogleSheetsClient();
          const targetSpreadsheetId = parameters.spreadsheetId || spreadsheetId;

          let request;
          switch (parameters.operation) {
            case "insertRows":
              request = {
                insertDimension: {
                  range: {
                    sheetId: parameters.sheetId || 0,
                    dimension: "ROWS",
                    startIndex: parameters.startIndex || 0,
                    endIndex:
                      parameters.endIndex || parameters.startIndex + 1 || 1,
                  },
                },
              };
              break;
            case "deleteRows":
              request = {
                deleteDimension: {
                  range: {
                    sheetId: parameters.sheetId || 0,
                    dimension: "ROWS",
                    startIndex: parameters.startIndex || 0,
                    endIndex:
                      parameters.endIndex || parameters.startIndex + 1 || 1,
                  },
                },
              };
              break;
            case "insertColumns":
              request = {
                insertDimension: {
                  range: {
                    sheetId: parameters.sheetId || 0,
                    dimension: "COLUMNS",
                    startIndex: parameters.startIndex || 0,
                    endIndex:
                      parameters.endIndex || parameters.startIndex + 1 || 1,
                  },
                },
              };
              break;
            case "deleteColumns":
              request = {
                deleteDimension: {
                  range: {
                    sheetId: parameters.sheetId || 0,
                    dimension: "COLUMNS",
                    startIndex: parameters.startIndex || 0,
                    endIndex:
                      parameters.endIndex || parameters.startIndex + 1 || 1,
                  },
                },
              };
              break;
            default:
              return c.json(err("Invalid operation"), 400);
          }

          if (request) {
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: targetSpreadsheetId,
              requestBody: {
                requests: [request!],
              },
            });

            result = {
              message: `I've completed the ${parameters.operation} operation on your sheet.`,
            };
          }
        } catch (error: any) {
          result = {
            message: `I had trouble manipulating that sheet: ${error.message}`,
          };
        }
        break;

      case "process":
        if (
          !parameters.instruction ||
          (!parameters.spreadsheetId && !spreadsheetId)
        ) {
          result = {
            message:
              "To process sheet data, I need a sheet ID and instructions on what to do with the data.",
          };
          break;
        }

        try {
          const sheets = await initGoogleSheetsClient();
          const range = parameters.range || "Sheet1!A1:Z1000";
          const targetRange =
            parameters.targetRange || parameters.range || "Sheet1!A1";

          // Read data
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: parameters.spreadsheetId || spreadsheetId,
            range,
          });

          const values = response.data.values || [];
          if (!values.length) {
            result = {
              message: "I didn't find any data in the specified range.",
            };
            break;
          }

          // Process with LLM
          const sheetData = JSON.stringify(values);
          const processPromptMessages = [
            new SystemMessage(
              "You are an AI assistant that processes Google Sheets data. " +
                "You should follow the user's instructions exactly and return data in the format requested. " +
                "Return only the processed data, nothing else.",
            ),
            new HumanMessage(
              `Here is data from a Google Sheet in JSON format: ${sheetData}\n\n` +
                `Instructions: ${parameters.instruction}\n\n` +
                `Process this data and return the result as a 2D array suitable for Google Sheets.`,
            ),
          ];

          const processResponse = await llm.invoke(processPromptMessages);

          // Ensure we're properly handling the content - LLM models might return content in different formats
          let processedContent: string;
          if (typeof processResponse.content === "string") {
            processedContent = processResponse.content;
          } else if (
            Array.isArray(processResponse.content) &&
            processResponse.content.length > 0
          ) {
            // Handle array content format (some LLMs return array of content parts)
            processedContent = JSON.stringify(processResponse.content);
          } else if (
            processResponse.content &&
            typeof processResponse.content.toString === "function"
          ) {
            processedContent = processResponse.content.toString();
          } else {
            throw new Error(
              "Unable to extract content from LLM response: " +
                JSON.stringify(processResponse),
            );
          }

          // Extract the 2D array from LLM response
          let processedData;
          try {
            // Try to parse as JSON first - remove any markdown code blocks
            const cleanedContent = processedContent
              .replace(/```(?:json|)\n?|\n?```/g, "")
              .trim();
            processedData = JSON.parse(cleanedContent);

            // Make sure it's actually a 2D array
            if (
              !Array.isArray(processedData) ||
              processedData.some((row) => !Array.isArray(row))
            ) {
              throw new Error("Parsed JSON is not a valid 2D array");
            }
          } catch (e) {
            console.log(
              "JSON parsing failed, attempting to parse as CSV-like format:",
              e,
            );

            // If JSON parsing fails, try to interpret the response as a nested array
            const lines = processedContent
              .replace(/```(?:.*|\n)```/g, "")
              .trim()
              .split("\n")
              .filter((line) => line.trim().length > 0);

            processedData = lines.map((line) =>
              line.split(",").map((cell) => cell.trim()),
            );
          }

          // Write back to sheet
          await sheets.spreadsheets.values.update({
            spreadsheetId: parameters.spreadsheetId || spreadsheetId,
            range: targetRange,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: processedData,
            },
          });

          result = {
            message: `I've processed the data as requested and updated ${targetRange}.`,
          };
        } catch (error: any) {
          result = {
            message: `I had trouble processing the sheet data: ${error.message}`,
          };
        }
        break;

      case "unknown":
      default:
        result = {
          message:
            "I'm not sure what you're asking me to do with Google Sheets. Could you please clarify? You can ask me to create, read, update, or process sheet data.",
        };
    }

    return c.json(success(result));
  } catch (error: any) {
    console.error("Error processing natural language command:", error);
    return c.json(
      success({
        message: `I encountered an error: ${error.message}. Please try again with a different request.`,
      }),
    );
  }
};

// Create a new Google Sheet
export const createSheet = async (c: Context) => {
  try {
    const { title } = await c.req.json();

    if (!title) {
      return c.json(err("Sheet title is required"), 400);
    }

    const sheets = await initGoogleSheetsClient();

    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    });

    return c.json(
      success({
        spreadsheetId: response.data.spreadsheetId,
        spreadsheetUrl: response.data.spreadsheetUrl,
        title: response.data.properties?.title,
      }),
    );
  } catch (error: any) {
    console.error("Error creating sheet:", error);
    return c.json(err(`Failed to create sheet: ${error.message}`), 500);
  }
};

// Update an existing Google Sheet
export const updateSheet = async (c: Context) => {
  try {
    const {
      spreadsheetId,
      values,
      range = "Sheet1!A1",
      valueInputOption = "USER_ENTERED",
    } = await c.req.json();

    if (!spreadsheetId || !values) {
      return c.json(err("Spreadsheet ID and values are required"), 400);
    }

    const sheets = await initGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody: {
        values,
      },
    });

    return c.json(
      success({
        updatedCells: response.data.updatedCells,
        updatedRange: response.data.updatedRange,
      }),
    );
  } catch (error: any) {
    console.error("Error updating sheet:", error);
    return c.json(err(`Failed to update sheet: ${error.message}`), 500);
  }
};

// Read data from a Google Sheet
export const readSheet = async (c: Context) => {
  try {
    const { spreadsheetId, range = "Sheet1!A1:Z1000" } = await c.req.json();

    if (!spreadsheetId) {
      return c.json(err("Spreadsheet ID is required"), 400);
    }

    const sheets = await initGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return c.json(
      success({
        values: response.data.values || [],
        range: response.data.range,
      }),
    );
  } catch (error: any) {
    console.error("Error reading sheet:", error);
    return c.json(err(`Failed to read sheet: ${error.message}`), 500);
  }
};

// Manipulate a Google Sheet (add/delete rows/columns)
export const manipulateSheet = async (c: Context) => {
  try {
    const {
      spreadsheetId,
      operation,
      sheetId = 0,
      startIndex,
      endIndex,
      dimension = "ROWS",
    } = await c.req.json();

    if (!spreadsheetId || !operation) {
      return c.json(err("Spreadsheet ID and operation are required"), 400);
    }

    if (
      !["insertRows", "deleteRows", "insertColumns", "deleteColumns"].includes(
        operation,
      )
    ) {
      return c.json(
        err(
          "Invalid operation. Allowed: insertRows, deleteRows, insertColumns, deleteColumns",
        ),
        400,
      );
    }

    if (startIndex === undefined) {
      return c.json(err("Start index is required"), 400);
    }

    const sheets = await initGoogleSheetsClient();
    let request;

    switch (operation) {
      case "insertRows":
        request = {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex: endIndex || startIndex + 1,
            },
          },
        };
        break;
      case "deleteRows":
        request = {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex: endIndex || startIndex + 1,
            },
          },
        };
        break;
      case "insertColumns":
        request = {
          insertDimension: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex,
              endIndex: endIndex || startIndex + 1,
            },
          },
        };
        break;
      case "deleteColumns":
        request = {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex,
              endIndex: endIndex || startIndex + 1,
            },
          },
        };
        break;
      default:
        return c.json(err("Invalid operation"), 400);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [request!],
      },
    });

    return c.json(
      success({
        spreadsheetId,
        status: "Sheet successfully manipulated",
      }),
    );
  } catch (error: any) {
    console.error("Error manipulating sheet:", error);
    return c.json(err(`Failed to manipulate sheet: ${error.message}`), 500);
  }
};

// Process sheet data with LLM
export const processSheetWithLLM = async (c: Context) => {
  try {
    const {
      spreadsheetId,
      range = "Sheet1!A1:B5",
      instruction,
      targetRange,
      rows = 5,
      columns = 2,
    } = await c.req.json();

    if (!spreadsheetId || !instruction) {
      return c.json(err("Spreadsheet ID and instruction are required"), 400);
    }

    // Extract just the sheet name from the range (e.g., "Sheet1" from "Sheet1!A1:Z10")
    const sheetName = range.split("!")[0] || "Sheet1";

    // Create a safer target range that won't exceed limits
    const safeRange = `${sheetName}!A1:${
      String.fromCharCode(65 + Math.min(columns - 1, 25)) // Column letter (A-Z)
    }${Math.min(rows, 1000)}`; // Row number with limit

    const effectiveTargetRange = targetRange || safeRange;

    // Create Google Sheets client
    const sheets = await initGoogleSheetsClient();

    // Process with LLM directly without requiring existing data
    const promptMessages = [
      new SystemMessage(
        "You are an AI assistant that generates and processes Google Sheets data. " +
          "You should follow the user's instructions exactly and return data in the format requested. " +
          `Make sure to generate EXACTLY ${rows} rows and ${columns} columns - no more, no less. ` +
          "Return only the processed data as a valid 2D array (array of arrays).",
      ),
      new HumanMessage(
        `Instructions: ${instruction}\n\n` +
          `Generate appropriate data for a ${rows}x${columns} spreadsheet (${rows} rows and ${columns} columns) as a 2D array suitable for Google Sheets.`,
      ),
    ];

    const processResponse = await llm.invoke(promptMessages);

    // Ensure we're properly handling the content - LLM models might return content in different formats
    let processedContent: string;
    if (typeof processResponse.content === "string") {
      processedContent = processResponse.content;
    } else if (
      Array.isArray(processResponse.content) &&
      processResponse.content.length > 0
    ) {
      // Handle array content format (some LLMs return array of content parts)
      processedContent = JSON.stringify(processResponse.content);
    } else if (
      processResponse.content &&
      typeof processResponse.content.toString === "function"
    ) {
      processedContent = processResponse.content.toString();
    } else {
      throw new Error(
        "Unable to extract content from LLM response: " +
          JSON.stringify(processResponse),
      );
    }

    // Extract the 2D array from LLM response
    let processedData;
    try {
      // Try to parse as JSON first - remove any markdown code blocks
      const cleanedContent = processedContent
        .replace(/```(?:json|)\n?|\n?```/g, "")
        .trim();
      processedData = JSON.parse(cleanedContent);

      // Validate that it's a 2D array and fix any issues
      if (!Array.isArray(processedData)) {
        throw new Error("LLM did not return an array");
      }

      // Ensure we have exactly the right number of rows
      if (processedData.length > rows) {
        // Trim excess rows
        processedData = processedData.slice(0, rows);
      } else if (processedData.length < rows) {
        // Add missing rows
        const lastRow =
          processedData.length > 0
            ? processedData[processedData.length - 1]
            : Array(columns).fill("");
        while (processedData.length < rows) {
          processedData.push(
            Array.isArray(lastRow) ? [...lastRow] : Array(columns).fill(""),
          );
        }
      }

      // Ensure each row has exactly the right number of columns
      processedData = processedData.map((row) => {
        if (!Array.isArray(row)) {
          // Convert non-array rows to arrays
          return Array(columns).fill("");
        }

        if (row.length > columns) {
          // Trim excess columns
          return row.slice(0, columns);
        } else if (row.length < columns) {
          // Add missing columns
          return [...row, ...Array(columns - row.length).fill("")];
        }
        return row;
      });
    } catch (e) {
      console.log(
        "JSON parsing failed, attempting to parse as CSV-like format:",
        e,
      );

      try {
        // If JSON parsing fails, try to interpret the response as a nested array
        const lines = processedContent
          .replace(/```(?:.*|\n)```/g, "")
          .trim()
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .slice(0, rows); // Limit to requested rows

        processedData = lines.map((line) => {
          const cells = line.split(",").map((cell) => cell.trim());
          // Ensure correct number of columns
          if (cells.length > columns) {
            return cells.slice(0, columns);
          } else if (cells.length < columns) {
            return [...cells, ...Array(columns - cells.length).fill("")];
          }
          return cells;
        });

        // If we still don't have enough rows, add blank rows
        while (processedData.length < rows) {
          processedData.push(Array(columns).fill(""));
        }
      } catch (csvError) {
        console.error("Failed to parse as CSV-like format:", csvError);
        // Create fallback data
        processedData = Array(rows)
          .fill(null)
          .map((_, rowIndex) =>
            Array(columns)
              .fill(null)
              .map((_, colIndex) =>
                colIndex === 0
                  ? `Row ${rowIndex + 1}`
                  : `Column ${colIndex + 1}`,
              ),
          );
      }
    }

    // 3. Write processed data back to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: effectiveTargetRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: processedData,
      },
    });

    return c.json(
      success({
        message: "Data processed successfully",
        updatedRange: effectiveTargetRange,
      }),
    );
  } catch (error: any) {
    console.error("Error processing sheet with LLM:", error);
    return c.json(err(`Failed to process sheet: ${error.message}`), 500);
  }
};

// Clear credentials (logout)
export const clearCredentials = async (c: Context) => {
  try {
    // Clear the specific user's credentials
    delete tokenStore[currentUserId];

    // Clear environment variables if they match the user's credentials
    // (In a real app with multiple users, you'd want to be more careful here)
    process.env.GOOGLE_CLIENT_ID = undefined;
    process.env.GOOGLE_CLIENT_SECRET = undefined;
    process.env.GOOGLE_REFRESH_TOKEN = undefined;

    return c.json(
      success({
        message: "Successfully logged out and cleared credentials",
      }),
    );
  } catch (error: any) {
    console.error("Error clearing credentials:", error);
    return c.json(err(`Failed to clear credentials: ${error.message}`), 500);
  }
};

export const generateSheetContent = async (c: Context) => {
  try {
    const {
      spreadsheetId,
      range = "Sheet1!A1:B5",
      dataType = "random",
      instruction = "",
      rows = 5,
      columns = 2,
      headerOnly = false,
    } = await c.req.json();

    if (!spreadsheetId) {
      return c.json(err("Spreadsheet ID is required"), 400);
    }

    // Extract just the sheet name from the range (e.g., "Sheet1" from "Sheet1!A1:Z10")
    const sheetName = range.split("!")[0] || "Sheet1";

    // Create a safer target range that won't exceed limits
    const safeRange = `${sheetName}!A1:${
      String.fromCharCode(65 + Math.min(columns - 1, 25)) // Column letter (A-Z)
    }${headerOnly ? 1 : Math.min(rows, 1000)}`; // Row number with limit

    const sheets = await initGoogleSheetsClient();

    // Generate content based on type using LLM
    const promptMessages = [
      new SystemMessage(
        "You are an expert at generating structured data for spreadsheets. " +
          "Generate only the data as a valid JSON 2D array with no additional text, explanation, or formatting. " +
          "The outer array represents rows, and each inner array represents columns in that row. " +
          (headerOnly
            ? `Generate EXACTLY 1 row with ${columns} column headers.`
            : `Make sure to generate EXACTLY ${rows} rows and ${columns} columns - no more, no less.`) +
          " Follow all specific instructions precisely. Make the data realistic and useful.",
      ),
      new HumanMessage(
        (headerOnly
          ? `Generate ${columns} column headers for a spreadsheet. `
          : `Generate a ${rows}x${columns} dataset (${rows} rows and ${columns} columns) with ${dataType} data. `) +
          `${instruction ? `Additional instructions: ${instruction}` : ""}\n\n` +
          "Return ONLY a JSON 2D array. Nothing else. No markdown formatting, no explanations.",
      ),
    ];

    const generationResponse = await llm.invoke(promptMessages);

    let generatedContent: string;
    if (typeof generationResponse.content === "string") {
      generatedContent = generationResponse.content;
    } else if (
      Array.isArray(generationResponse.content) &&
      generationResponse.content.length > 0
    ) {
      // Handle array content format (some LLMs return array of content parts)
      generatedContent = JSON.stringify(generationResponse.content);
    } else if (
      generationResponse.content &&
      typeof generationResponse.content.toString === "function"
    ) {
      generatedContent = generationResponse.content.toString();
    } else {
      throw new Error("Unable to extract content from LLM response");
    }

    // Extract the 2D array from LLM response
    let generatedData;
    try {
      // Try to parse as JSON first
      generatedContent = generatedContent
        .replace(/```(?:json|)\n?|\n?```/g, "")
        .trim();
      generatedData = JSON.parse(generatedContent);

      // Validate that it's a 2D array and fix any issues
      if (!Array.isArray(generatedData)) {
        throw new Error("LLM did not return an array");
      }

      if (headerOnly) {
        // For header only, we want just one row
        if (generatedData.length > 1) {
          generatedData = [generatedData[0]];
        } else if (generatedData.length === 0) {
          // Create default headers if none were generated
          generatedData = [
            Array(columns)
              .fill(null)
              .map((_, i) => `Column ${i + 1}`),
          ];
        }

        // Ensure correct number of columns
        if (generatedData[0].length > columns) {
          generatedData[0] = generatedData[0].slice(0, columns);
        } else if (generatedData[0].length < columns) {
          generatedData[0] = [
            ...generatedData[0],
            ...Array(columns - generatedData[0].length).fill("Column"),
          ];
        }
      } else {
        // For full data generation, handle rows and columns
        // Ensure we have exactly the right number of rows
        if (generatedData.length > rows) {
          // Trim excess rows
          generatedData = generatedData.slice(0, rows);
        } else if (generatedData.length < rows) {
          // Add missing rows
          const lastRow =
            generatedData.length > 0
              ? generatedData[generatedData.length - 1]
              : Array(columns).fill("");
          while (generatedData.length < rows) {
            generatedData.push(
              Array.isArray(lastRow) ? [...lastRow] : Array(columns).fill(""),
            );
          }
        }

        // Ensure each row has exactly the right number of columns
        generatedData = generatedData.map((row) => {
          if (!Array.isArray(row)) {
            // Convert non-array rows to arrays
            return Array(columns).fill("");
          }

          if (row.length > columns) {
            // Trim excess columns
            return row.slice(0, columns);
          } else if (row.length < columns) {
            // Add missing columns
            return [...row, ...Array(columns - row.length).fill("")];
          }
          return row;
        });
      }
    } catch (e: any) {
      console.error("Error parsing LLM output:", e, generatedContent);

      // Create a fallback array with the right dimensions if parsing fails
      if (headerOnly) {
        generatedData = [
          Array(columns)
            .fill(null)
            .map((_, i) => `Column ${i + 1}`),
        ];
      } else {
        generatedData = Array(rows)
          .fill(null)
          .map((_, rowIndex) =>
            Array(columns)
              .fill(null)
              .map((_, colIndex) =>
                colIndex === 0
                  ? `Row ${rowIndex + 1}`
                  : `${dataType} ${colIndex + 1}`,
              ),
          );
      }

      console.log("Using fallback generated data:", generatedData);
    }

    // Update the sheet with the generated content
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: safeRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: generatedData,
      },
    });

    return c.json(
      success({
        spreadsheetId,
        range: safeRange,
        updatedRows: generatedData.length,
        updatedColumns: generatedData[0]?.length || 0,
        status: headerOnly
          ? "Headers successfully added to sheet"
          : "Content successfully generated and added to sheet",
      }),
    );
  } catch (error: any) {
    console.error("Error generating sheet content:", error);
    return c.json(err(`Failed to generate content: ${error.message}`), 500);
  }
};
