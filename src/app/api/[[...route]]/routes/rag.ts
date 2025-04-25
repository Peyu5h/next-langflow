import { Hono } from "hono";
import {
  uploadPdf,
  queryPdf,
  listFiles,
  removeFile,
} from "../controllers/rag.controller";

const ragRoute = new Hono();

ragRoute.post("/upload", uploadPdf);
ragRoute.post("/query", queryPdf);
ragRoute.get("/files", listFiles);
ragRoute.post("/delete", removeFile);

export default ragRoute;
