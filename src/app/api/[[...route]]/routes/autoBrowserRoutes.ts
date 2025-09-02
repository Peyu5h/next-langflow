import { Hono } from "hono";
import { testBrowser } from "../controllers/autoBrowser.controller";

const autoBrowserRoute = new Hono();

//chaining
autoBrowserRoute.post("/test", testBrowser);

export default autoBrowserRoute;
