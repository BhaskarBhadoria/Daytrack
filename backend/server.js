import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import goalsRoutes from "./routes/goals.js";
import sleepRoutes from "./routes/sleep.js";
import reportsRoutes from "./routes/reports.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/sleep", sleepRoutes);
app.use("/api/reports", reportsRoutes);

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`DayTrack API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
