import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import goalsRoutes from "./routes/goals.js";
import sleepRoutes from "./routes/sleep.js";
import reportsRoutes from "./routes/reports.js";
import settingsRoutes from "./routes/settings.js";
import timetableRoutes from "./routes/timetable.js";
import syllabusRoutes from "./routes/syllabus.js";
import googleRoutes from "./routes/google.js";
import attendanceRoutes from "./routes/attendance.js";
import exportRoutes from "./routes/export.js";
import filesRoutes from "./routes/files.js";
import journalRoutes from "./routes/journal.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/sleep", sleepRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/journal", journalRoutes);

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`DayTrack API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
