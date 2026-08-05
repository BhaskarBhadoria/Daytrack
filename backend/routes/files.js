import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB — this is base64-in-Postgres storage, kept intentionally small

// GET /api/files — metadata only, never the file content (keeps list requests light)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, filename, mime_type, size_bytes, uploaded_at FROM uploaded_files WHERE user_id = $1 ORDER BY uploaded_at DESC",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// POST /api/files  { filename, mime_type, data_base64 }
router.post("/", async (req, res) => {
  try {
    const { filename, mime_type, data_base64 } = req.body;
    if (!filename || !mime_type || !data_base64) {
      return res.status(400).json({ error: "filename, mime_type, data_base64 are required" });
    }
    const sizeBytes = Math.ceil((data_base64.length * 3) / 4);
    if (sizeBytes > MAX_FILE_BYTES) {
      return res.status(413).json({ error: "File too large — 3MB max" });
    }
    const result = await pool.query(
      `INSERT INTO uploaded_files (user_id, filename, mime_type, size_bytes, data_base64)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, filename, mime_type, size_bytes, uploaded_at`,
      [req.userId, filename, mime_type, sizeBytes, data_base64]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// GET /api/files/:id/download
router.get("/:id/download", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT filename, mime_type, data_base64 FROM uploaded_files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "File not found" });
    const file = result.rows[0];
    const buffer = Buffer.from(file.data_base64, "base64");
    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download file" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM uploaded_files WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "File not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
