import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, File } from "lucide-react";
import { supabase } from "../api/auth";
import { uploadDocument, pollDocumentStatus } from "../api/backend";
import Header from "../components/Header";

const STAGES = ["Waiting", "Uploading…", "Processing…", "Ready to search"];

function stagePct(stage) {
  const idx = STAGES.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (STAGES.length - 1)) * 100);
}

function FileRow({ item }) {
  const pct = stagePct(item.stage);
  const done = item.stage === "Ready to search";
  const failed = !!item.error;

  return (
    <div style={s.fileRow}>
      <div style={s.fileRowTop}>
        <span style={s.fileName}>{item.name}</span>
        <span style={{
          ...s.fileStatus,
          color: failed ? "#a3342a" : done ? "#12876a" : "#5f6b66",
        }}>
          {failed ? "Failed" : done ? "Done" : `${pct}%`}
        </span>
      </div>
      <div style={s.fileMeta}>
        <span style={{ color: failed ? "#a3342a" : "#5f6b66" }}>
          {failed ? item.error : item.slow
            ? "Still processing this large file — you can navigate away and check back in your library."
            : item.stage}
        </span>
        <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
      <div style={s.track}>
        <div style={{
          ...s.fill,
          width: failed ? "100%" : `${pct}%`,
          backgroundColor: failed ? "#f0c4bf" : done ? "#12876a" : "#3fae8c",
        }} />
      </div>
    </div>
  );
}

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [queue, setQueue] = useState([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (u) {
        setUserName(u.user_metadata?.display_name || u.email?.split("@")[0] || "");
        setUserEmail(u.email || "");
      }
    });
  }, []);

  const processFiles = async (files) => {
    const newItems = Array.from(files).map(f => ({
      id: `${f.name}-${f.lastModified}`,
      name: f.name,
      size: f.size,
      stage: "Waiting",
      error: null,
      slow: false,
      file: f,
    }));

    setQueue(q => [...q, ...newItems]);

    for (const item of newItems) {
      const update = (patch) =>
        setQueue(q => q.map(x => x.id === item.id ? { ...x, ...patch } : x));

      try {
        update({ stage: "Uploading…" });
        const result = await uploadDocument(item.file);

        if (result.status === "processing" && result.document?.id) {
          update({ stage: "Processing…" });
          const slowTimer = setTimeout(() => {
            update({ slow: true });
          }, 5 * 60 * 1000); // 5 minutes
          try {
            await pollDocumentStatus(result.document.id, (status) => {
              if (status === "processing") update({ stage: "Processing…" });
            });
          } finally {
            clearTimeout(slowTimer);
          }
        }

        update({ stage: "Ready to search" });
      } catch (err) {
        update({ error: err.message || "Upload failed" });
      }
    }
  };

  const handleFiles = (files) => {
    const accepted = [];
    for (const f of Array.from(files)) {
      const ext = f.name.split(".").pop().toLowerCase();
      if (!["pdf", "txt", "doc", "docx"].includes(ext)) continue;
      if (f.size > 100 * 1024 * 1024) {
        setQueue(q => [...q, {
          id: `${f.name}-${f.lastModified}`,
          name: f.name,
          size: f.size,
          stage: "Waiting",
          error: `File is ${(f.size / 1024 / 1024).toFixed(1)} MB — maximum is 100 MB.`,
          file: f,
        }]);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) processFiles(accepted);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const allDone = queue.length > 0 && queue.every(x => x.stage === "Ready to search" || x.error);
  const inProgress = queue.some(x => x.stage === "Uploading…" || x.stage === "Processing…");

  return (
    <>
      <Header userName={userName} userEmail={userEmail} />
      <main style={s.page}>
        <h1 style={s.title}>Upload documents</h1>
        <p style={s.subtitle}>Slides, readings or your own notes. They stay private to your account.</p>

        {/* Dropzone */}
        <div
          style={{ ...s.dropzone, ...(dragging ? s.dropzoneDragging : {}) }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div style={s.dropzoneIcon}>
            <UploadCloud size={22} color="#0b5c47" strokeWidth={2} />
          </div>
          <h2 style={s.dropzoneTitle}>Drag your files here</h2>
          <p style={s.dropzoneBody}>PDF, DOCX or TXT · up to 100 MB each</p>
          <p style={s.dropzoneNote}>Large files can take 1–2 minutes to process.</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx"
            style={{ display: "none" }}
            onChange={e => handleFiles(e.target.files)}
          />
          <button onClick={() => fileInputRef.current?.click()} style={s.browseBtn}>
            Browse files
          </button>
        </div>

        {/* Progress card */}
        {queue.length > 0 && (
          <div style={s.progressCard}>
            <div style={s.progressHeader}>
              <span style={s.progressTitle}>
                {inProgress
                  ? `Uploading · ${queue.length} file${queue.length !== 1 ? "s" : ""}`
                  : `${queue.length} file${queue.length !== 1 ? "s" : ""} processed`}
              </span>
            </div>
            {queue.map(item => <FileRow key={item.id} item={item} />)}
          </div>
        )}

        {/* Footer actions */}
        {queue.length > 0 && (
          <div style={s.footer}>
            <button
              onClick={() => setQueue([])}
              style={s.cancelBtn}
            >
              Clear
            </button>
            <button
              onClick={() => navigate("/library")}
              disabled={!allDone}
              style={{ ...s.doneBtn, ...(!allDone ? s.doneBtnDisabled : {}) }}
            >
              Done
            </button>
          </div>
        )}
      </main>
    </>
  );
}

const s = {
  page: {
    maxWidth: "820px",
    margin: "0 auto",
    padding: "38px 28px 72px",
  },
  title: {
    fontSize: "30px",
    fontWeight: "700",
    color: "#16201c",
    letterSpacing: "-0.026em",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "15px",
    color: "#5f6b66",
    marginBottom: "28px",
  },
  dropzone: {
    backgroundColor: "#ffffff",
    border: "2px dashed #c6d3cd",
    borderRadius: "16px",
    padding: "46px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
    transition: "border-color 0.15s, background-color 0.15s",
  },
  dropzoneDragging: {
    borderColor: "#12876a",
    backgroundColor: "#f0f5f2",
  },
  dropzoneIcon: {
    width: "48px",
    height: "48px",
    backgroundColor: "#dff2ec",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  dropzoneTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#16201c",
  },
  dropzoneBody: {
    fontSize: "14px",
    color: "#7b8681",
  },
  dropzoneNote: {
    fontSize: "12px",
    color: "#9aa5a0",
    marginTop: "2px",
  },
  browseBtn: {
    marginTop: "6px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 28px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  progressCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "20px",
  },
  progressHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #f1f4f2",
  },
  progressTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#16201c",
  },
  fileRow: {
    padding: "15px 20px",
    borderBottom: "1px solid #f1f4f2",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fileRowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  fileName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#16201c",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
  },
  fileStatus: {
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
  },
  fileMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#5f6b66",
  },
  track: {
    height: "6px",
    backgroundColor: "#eef1ef",
    borderRadius: "999px",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.4s ease, background-color 0.3s",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  cancelBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid #d9dfdb",
    color: "#16201c",
    borderRadius: "10px",
    padding: "11px 22px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  doneBtn: {
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "11px 22px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  doneBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};
