import { Hono } from "hono";
import {
  getAuthUrl,
  handleGoogleCallback,
  setCredentials,
  getSheetsList,
  createSheet,
  updateSheet,
  readSheet,
  manipulateSheet,
  processSheetWithLLM,
  clearCredentials,
  generateSheetContent,
  processNaturalLanguageCommand,
} from "../controllers/sheets.controller";

const sheetsRoutes = new Hono();

// Authentication routes
sheetsRoutes.get("/auth", getAuthUrl);
sheetsRoutes.get("/auth/callback", handleGoogleCallback);
sheetsRoutes.post("/credentials", setCredentials);
sheetsRoutes.post("/logout", clearCredentials);

// Sheet operations
sheetsRoutes.get("/list", getSheetsList);
sheetsRoutes.post("/create", createSheet);
sheetsRoutes.post("/update", updateSheet);
sheetsRoutes.post("/read", readSheet);
sheetsRoutes.post("/manipulate", manipulateSheet);
sheetsRoutes.post("/process", processSheetWithLLM);
sheetsRoutes.post("/generate", generateSheetContent);
sheetsRoutes.post("/chat", processNaturalLanguageCommand);

export default sheetsRoutes;
