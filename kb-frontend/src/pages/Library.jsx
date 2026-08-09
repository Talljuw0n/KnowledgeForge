import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { File } from "lucide-react";
import { supabase } from "../api/auth";
import { fetchDocuments, deleteDocument } from "../api/backend";
import Header from "../components/Header";

const FILE_TYPES = ["All", "PDF", "DOCX", "TXT"];

function FileBadge({ filename }) {
  const ext = filename.split(".").pop().toLowerCase();
  const styles = {
    pdf:  { bg: "#dff2ec", color: "#0b5c47", label: "PDF" },
    docx: { bg: "#e6eefb", color: "#23527c", label: "DOCX" },
    doc:  { bg: "#e6eefb", color: "#23527c", label: "DOCX" },
    txt:  { bg: "#f3eede", color: "#7a5f21", label: "TXT" },
  };
  const st = styles[ext] || { bg: "#f5f7f6", color: "#5f6b66", label: ext.toUpperCase() };
  return (
    <span style={{
      display: "inline-block",
      backgroundColor: st.bg,
      color: st.color,
      fontSize: "11px",
      fontWeight: "700",
      padding: "4px 9px",
      borderRadius: "999px",
    }}>
      {st.label}
    </span>
  );
}

export default function Library() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (u) {
        setUserName(u.user_metadata?.display_name || u.email?.split("@")[0] || "");
        setUserEmail(u.email || "");
      }
    });

    fetchDocuments()
      .then(d => setDocuments(d || []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = documents.filter(doc => {
    if (activeFilter === "All") return true;
    const ext = doc.filename.split(".").pop().toLowerCase();
    return ext === activeFilter.toLowerCase() || (activeFilter === "DOCX" && ext === "doc");
  });

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.filename}"?`)) return;
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.filename);
      setDocuments(d => d.filter(x => x.id !== doc.id));
    } catch {
      alert("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Header userName={userName} userEmail={userEmail} />
      <main style={s.page}>
        <h1 style={s.title}>Library</h1>
        <p style={s.subtitle}>
          {documents.length > 0
            ? `${documents.length} document${documents.length !== 1 ? "s" : ""} in your library.`
            : "No documents yet."}
        </p>

        {/* Filter pills */}
        <div style={s.filters}>
          {FILE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              style={{
                ...s.filterPill,
                ...(activeFilter === type ? s.filterActive : s.filterInactive),
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div style={s.tableCard}>
          {/* Header row */}
          <div style={s.tableHead}>
            <div style={{ ...s.th, flex: "2.2 1 220px" }}>Document</div>
            <div style={{ ...s.th, flex: "1.1 1 0" }}>Type</div>
            <div style={{ ...s.th, flex: "0 0 108px" }}>Added</div>
            <div style={{ ...s.th, flex: "0 0 92px" }} />
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ padding: "20px" }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: "48px", borderRadius: "8px", marginBottom: "8px" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState activeFilter={activeFilter} onUpload={() => navigate("/upload")} />
          ) : (
            filtered.map((doc, i) => (
              <DocRow
                key={doc.id}
                doc={doc}
                isLast={i === filtered.length - 1}
                deleting={deletingId === doc.id}
                onOpen={() => navigate(`/document/${doc.id}`)}
                onAsk={() => navigate("/chat", { state: { documentId: doc.id, filename: doc.filename } })}
                onDelete={() => handleDelete(doc)}
              />
            ))
          )}
        </div>
      </main>
    </>
  );
}

function DocRow({ doc, isLast, deleting, onOpen, onAsk, onDelete }) {
  const [hovered, setHovered] = useState(false);

  const added = doc.created_at
    ? new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      style={{
        ...s.row,
        ...(hovered ? s.rowHover : {}),
        ...(isLast ? { borderBottom: "none" } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: "2.2 1 220px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <File size={16} color="#9aa5a0" />
        <button onClick={onOpen} style={s.docName}>{doc.filename}</button>
      </div>
      <div style={{ flex: "1.1 1 0" }}>
        <FileBadge filename={doc.filename} />
      </div>
      <div style={{ flex: "0 0 108px" }}>
        <span style={s.docMeta}>{added}</span>
      </div>
      <div style={{ flex: "0 0 92px", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
        <button
          onClick={onAsk}
          style={{ ...s.actionBtn, ...s.askBtn }}
        >
          Ask
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{ ...s.actionBtn, ...s.deleteBtn }}
          title="Delete"
        >
          {deleting ? "…" : "×"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ activeFilter, onUpload }) {
  return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>
        <File size={28} color="#0b5c47" />
      </div>
      <p style={s.emptyTitle}>
        {activeFilter === "All" ? "Nothing here yet" : `No ${activeFilter} files`}
      </p>
      <p style={s.emptyBody}>
        {activeFilter === "All"
          ? "Upload your first document to start asking questions about it."
          : `You haven't uploaded any ${activeFilter} files yet.`}
      </p>
      {activeFilter === "All" && (
        <button onClick={onUpload} style={s.emptyBtn}>Upload a document</button>
      )}
    </div>
  );
}

const s = {
  page: {
    maxWidth: "1240px",
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
    marginBottom: "24px",
  },
  filters: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  filterPill: {
    padding: "9px 15px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    border: "none",
    transition: "all 0.12s",
  },
  filterActive: {
    backgroundColor: "#12876a",
    color: "#ffffff",
  },
  filterInactive: {
    backgroundColor: "#ffffff",
    border: "1px solid #d9dfdb",
    color: "#3d4a45",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #e3e7e4",
  },
  tableHead: {
    backgroundColor: "#f9fbfa",
    padding: "13px 20px",
    borderBottom: "1px solid #eef1ef",
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },
  th: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#9aa5a0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  row: {
    padding: "15px 20px",
    borderBottom: "1px solid #f1f4f2",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    transition: "background-color 0.1s",
  },
  rowHover: {
    backgroundColor: "#f9fbfa",
  },
  docName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#16201c",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    transition: "color 0.12s",
  },
  docMeta: {
    fontSize: "14px",
    color: "#7b8681",
  },
  actionBtn: {
    borderRadius: "8px",
    padding: "7px 12px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid #e3e7e4",
    transition: "all 0.12s",
  },
  askBtn: {
    backgroundColor: "#f5f7f6",
    color: "#0b5c47",
  },
  deleteBtn: {
    backgroundColor: "#fdf2f1",
    color: "#a3342a",
    borderColor: "#f0c4bf",
  },
  empty: {
    padding: "64px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    textAlign: "center",
  },
  emptyIcon: {
    width: "62px",
    height: "62px",
    backgroundColor: "#dff2ec",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "6px",
  },
  emptyTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#16201c",
  },
  emptyBody: {
    fontSize: "15px",
    color: "#5f6b66",
    maxWidth: "40ch",
    lineHeight: "1.55",
  },
  emptyBtn: {
    marginTop: "10px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "11px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
