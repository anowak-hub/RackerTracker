import "dotenv/config";
import express from "express";
import cors from "cors";
import { modulesRouter } from "./routes/modules.js";
import { computersRouter } from "./routes/computers.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/modules", modulesRouter);
app.use("/api/computers", computersRouter);

// Centralized error handler - keeps route handlers free of try/catch
// boilerplate for anything that isn't a deliberate validation response.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`RackerTracker API listening on port ${port}`);
});
