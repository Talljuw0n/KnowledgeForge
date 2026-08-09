import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { File, ArrowRight } from "lucide-react";
import { supabase } from "../api/auth";
import { fetchDocuments } from "../api/backend";
import Header from "../components/Header";

const SUGGESTIONS = [
  "Summarise the key concepts",
  "Quiz me on this topic",
  "What are the main takeaways?",
];

function FileBadge({ filename }) {
  const ext = filename.split(".").pop().toLowerCase();
  const styles = {
    pdf:  { bg: "#dff2ec", color: "#0b5c47" },
    docx: { bg: "#e6eefb", color: "#23527c" },
    doc:  { bg: "#e6eefb", color: "#23527c" },
    txt:  { bg: "#f3eede", color: "#7a5f21" },
  };
  const st = styles[ext] || { bg: "#f5f7f6", color: "#5f6b66" };
  return (
    <span style={{
      display: "inline-block",
      backgroundColor: st.bg,
      color: st.color,
      fontSize: "11px",
      fontWeight: "700",
      padding: "4px 9px",
      borderRadius: "999px",
      textTransform: "uppercase",
    }}>
      {ext}
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [question, setQuestion] = useState("");

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
      .finally(() => setLoadingDocs(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  };

  const firstName = userName.split(" ")[0] || "there";

  const handleAsk = (q) => {
    const text = q || question;
    if (!text.trim()) return;
    navigate("/chat", { state: { question: text } });
  };

  return (
    <>
      <Header userName={userName} userEmail={userEmail} />
      <main style={s.page}>
        {/* Title */}
        <h1 style={s.title}>{greeting()}, {firstName}</h1>
        <p style={s.subtitle}>
          {documents.length > 0
            ? `You have ${documents.length} document${documents.length !== 1 ? "s" : ""} ready. Ask anything and the answer will point back at the page.`
            : "Upload your first document to start asking questions about it."}
        </p>

        {/* Ask card */}
        <div style={s.askCard}>
          <div style={s.askRow}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAsk()}
              placeholder="Ask a question about your documents…"
              style={s.askInput}
            />
            <button onClick={() => handleAsk()} style={s.askBtn}>Ask</button>
          </div>
          {SUGGESTIONS.length > 0 && (
            <div style={s.chipRow}>
              {SUGGESTIONS.map(s_ => (
                <button
                  key={s_}
                  onClick={() => handleAsk(s_)}
                  style={s.chip}
                >
                  {s_}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Two-column layout */}
        <div style={s.cols}>
          {/* Documents */}
          <div>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Your documents</h2>
              {documents.length > 0 && (
                <button onClick={() => navigate("/library")} style={s.seeAll}>
                  See all {documents.length}
                </button>
              )}
            </div>

            {loadingDocs ? (
              <div style={s.docGrid}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton" style={s.docCardSkeleton} />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <EmptyDocs onUpload={() => navigate("/upload")} />
            ) : (
              <div style={s.docGrid}>
                {documents.slice(0, 6).map(doc => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    onClick={() => navigate(`/document/${doc.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right rail */}
          <div style={s.rail}>
            <div style={s.uploadPrompt}>
              <h3 style={s.uploadPromptTitle}>Add this week's materials</h3>
              <p style={s.uploadPromptBody}>
                Upload lecture slides, readings or your own notes. Answers will always cite the source page.
              </p>
              <button onClick={() => navigate("/upload")} style={s.uploadPromptBtn}>
                Upload documents
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function DocCard({ doc, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.docCard,
        ...(hovered ? s.docCardHover : {}),
      }}
    >
      <FileBadge filename={doc.filename} />
      <p style={s.docName}>{doc.filename}</p>
      <p style={s.docMeta}>
        {doc.created_at
          ? new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : ""}
      </p>
    </button>
  );
}

function EmptyDocs({ onUpload }) {
  return (
    <div style={s.emptyDocs}>
      <div style={s.emptyIcon}>
        <File size={24} color="#0b5c47" />
      </div>
      <p style={s.emptyTitle}>No documents yet</p>
      <p style={s.emptyBody}>Upload your first document to start asking questions.</p>
      <button onClick={onUpload} style={s.emptyBtn}>Upload a document</button>
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
    marginBottom: "28px",
  },
  askCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 2px 6px rgba(22,32,28,0.04)",
    marginBottom: "38px",
  },
  askRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "14px",
  },
  askInput: {
    flex: 1,
    padding: "14px 16px",
    fontSize: "16px",
    border: "1px solid #d9dfdb",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#16201c",
    outline: "none",
  },
  askBtn: {
    flexShrink: 0,
    padding: "0 26px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  chip: {
    backgroundColor: "#f5f7f6",
    border: "1px solid #e3e7e4",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "13px",
    color: "#3d4a45",
    cursor: "pointer",
    transition: "border-color 0.12s, background-color 0.12s",
  },
  cols: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1.6fr) minmax(280px,1fr)",
    gap: "26px",
    alignItems: "start",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#16201c",
    letterSpacing: "-0.012em",
  },
  seeAll: {
    background: "none",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f7a5f",
    cursor: "pointer",
    padding: 0,
  },
  docGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(232px,1fr))",
    gap: "16px",
  },
  docCardSkeleton: {
    height: "110px",
    borderRadius: "14px",
  },
  docCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 2px 6px rgba(22,32,28,0.04)",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.12s, box-shadow 0.12s",
    width: "100%",
  },
  docCardHover: {
    borderColor: "#b9ded0",
    boxShadow: "0 6px 18px rgba(22,32,28,0.08)",
  },
  docName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#16201c",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  docMeta: {
    fontSize: "13px",
    color: "#7b8681",
  },
  rail: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  uploadPrompt: {
    backgroundColor: "#f0f5f2",
    border: "1px solid #dbe8e2",
    borderRadius: "16px",
    padding: "20px",
  },
  uploadPromptTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#16201c",
    marginBottom: "8px",
  },
  uploadPromptBody: {
    fontSize: "13px",
    color: "#5f6b66",
    lineHeight: "1.55",
    marginBottom: "14px",
  },
  uploadPromptBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid #b9ded0",
    color: "#0b5c47",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  emptyDocs: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "16px",
    padding: "48px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    textAlign: "center",
  },
  emptyIcon: {
    width: "56px",
    height: "56px",
    backgroundColor: "#dff2ec",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  emptyTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#16201c",
  },
  emptyBody: {
    fontSize: "14px",
    color: "#5f6b66",
    maxWidth: "36ch",
  },
  emptyBtn: {
    marginTop: "8px",
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
