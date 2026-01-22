import { useState } from "react";
import { uploadDocument } from "../api/backend";

export default function UploadBox({ onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      await uploadDocument(file);
      setFile(null);
      onUpload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload} disabled={loading}>
        Upload
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
