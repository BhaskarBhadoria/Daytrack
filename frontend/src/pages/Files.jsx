import { useEffect, useRef, useState } from "react";
import { api, downloadFile } from "../api.js";
import Spinner from "../components/Spinner.jsx";

const MAX_BYTES = 3 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      setFiles(await api.getFiles());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    if (file.size > MAX_BYTES) {
      setError("File too large — 3MB max (this is meant for small notes, not big media).");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      try {
        const created = await api.uploadFile(file.name, file.type || "application/octet-stream", base64);
        setFiles((prev) => [created, ...prev]);
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleDelete(id) {
    await api.deleteFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  if (loading) return <Spinner label="Loading files" />;

  return (
    <div className="files-page">
      <p className="hero-greeting">Small notes and documents</p>
      <h1>Files</h1>
      <p className="empty">3MB max per file.</p>

      <div className="notice-box">
        <p>{uploading ? "Uploading…" : "Choose a file to upload."}</p>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Upload file"}
        </button>
        <input ref={inputRef} type="file" hidden onChange={handleFileChange} />
      </div>

      {error && <p className="error">{error}</p>}

      {files.length === 0 ? (
        <p className="empty">No files uploaded yet.</p>
      ) : (
        <ul className="files-list">
          {files.map((f) => (
            <li key={f.id} className="files-row">
              <span className="files-name">{f.filename}</span>
              <span className="files-meta">{formatSize(f.size_bytes)}</span>
              <span className="files-meta">{new Date(f.uploaded_at).toLocaleDateString()}</span>
              <button
                className="icon-btn"
                onClick={() => downloadFile(f.id, f.filename).catch((err) => setError(err.message))}
                title="Download"
              >
                ⬇
              </button>
              <button className="icon-btn" onClick={() => handleDelete(f.id)} title="Delete">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
