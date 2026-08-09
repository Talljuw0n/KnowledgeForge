import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, File } from "lucide-react";
import { supabase } from "../api/auth";
import { fetchDocuments } from "../api/backend";
import Header from "../components/Header";

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
      padding: "5px 11px",
      borderRadius: "999px",
    }}>
      {st.label}
    </span>
  );
}

export default function Document() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (u) {
        setUserName(u.user_metadata?.display_name || u.email?.split("@")[0] || "");
        setUserEmail(u.email || "");
      }
    });

    fetchDocuments()
      .then(docs => {
        const found = (docs || []).find(d => String(d.id) === String(id));
        setDoc(found || null);
      })
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Header userName={userName} userEmail={userEmail} />
        <main style={s.page}>
          <div className="skeleton" style={{ height: "40px", width: "120px", borderRadius: "8px", marginBottom: "24px" }} />
          <div className="skeleton" style={{ height: "400px", borderRadius: "16px" }} />
        </main>
      </>
    );
  }

  if (!doc) {
    return (
      <>
        <Header userName={userName} userEmail={userEmail} />
        <main style={s.page}>
          <button onClick={() => navigate("/library")} style={s.backBtn}>
            <ChevronLeft size={16} />
            Library
          </button>
          <div style={s.notFound}>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#16201c" }}>Document not found</p>
            <p style={{ fontSize: "14px", color: "#5f6b66", marginTop: "8px" }}>
              This document may have been deleted.
            </p>
          </div>
        </main>
      </>
    );
  }

  const added = doc.created_at
    ? new Date(doc.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <>
      <Header userName={userName} userEmail={userEmail} />
      <main style={s.page}>
        {/* Back link */}
        <button onClick={() => navigate("/library")} style={s.backBtn}>
          <ChevronLeft size={16} strokeWidth={2} />
          Library
        </button>

        <div style={s.layout}>
          {/* Article */}
          <article style={s.article}>
            {/* Badges */}
            <div style={s.badgeRow}>
              <FileBadge filename={doc.filename} />
              {added && (
                <span style={s.metaBadge}>Added {added}</span>
              )}
            </div>

            {/* Title */}
            <h1 style={s.docTitle}>{doc.filename}</h1>

            {/* Info message */}
            <div style={s.infoBox}>
              <p style={s.infoText}>
                This document is stored privately in your knowledge base. Ask questions about it in Chat — the answer will always cite the source page or slide.
              </p>
            </div>

            <div style={s.sectionLabel}>Document details</div>
            <div style={s.detailsGrid}>
              <div style={s.detailRow}>
                <span style={s.detailKey}>Filename</span>
                <span style={s.detailValue}>{doc.filename}</span>
              </div>
              {added && (
                <div style={s.detailRow}>
                  <span style={s.detailKey}>Added</span>
                  <span style={s.detailValue}>{added}</span>
                </div>
              )}
              <div style={s.detailRow}>
                <span style={s.detailKey}>Type</span>
                <span style={s.detailValue}>{doc.filename.split(".").pop().toUpperCase()}</span>
              </div>
            </div>
          </article>

          {/* Right rail */}
          <aside style={s.rail}>
            <div style={s.railCard}>
              <h3 style={s.railTitle}>Ask about this document</h3>
              <p style={s.railBody}>Open a chat session scoped to this document. The answer will always reference the exact page.</p>
              <button
                onClick={() => navigate("/chat", { state: { documentId: doc.id, filename: doc.filename } })}
                style={s.railBtn}
              >
                Ask a question
              </button>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

const s = {
  page: {
    maxWidth: "1240px",
    margin: "0 auto",
    padding: "26px 28px 72px",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f7a5f",
    cursor: "pointer",
    padding: 0,
    marginBottom: "24px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 320px",
    gap: "24px",
    alignItems: "start",
  },
  article: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "16px",
    padding: "36px 40px 44px",
  },
  badgeRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  metaBadge: {
    display: "inline-block",
    backgroundColor: "#f5f7f6",
    color: "#5f6b66",
    fontSize: "11px",
    fontWeight: "700",
    padding: "5px 11px",
    borderRadius: "999px",
  },
  docTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#16201c",
    letterSpacing: "-0.024em",
    lineHeight: "1.2",
    marginBottom: "26px",
  },
  infoBox: {
    backgroundColor: "#f7faf8",
    borderLeft: "3px solid #12876a",
    borderRadius: "12px",
    padding: "16px 18px",
    marginBottom: "28px",
  },
  infoText: {
    fontSize: "15px",
    color: "#2b3733",
    lineHeight: "1.65",
  },
  sectionLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#7b8681",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "14px",
  },
  detailsGrid: {
    border: "1px solid #f1f4f2",
    borderRadius: "12px",
    overflow: "hidden",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #f1f4f2",
  },
  detailKey: {
    fontSize: "14px",
    color: "#5f6b66",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#16201c",
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "200px",
  },
  rail: {
    position: "sticky",
    top: "90px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  railCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "16px",
    padding: "20px",
  },
  railTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#16201c",
    marginBottom: "8px",
  },
  railBody: {
    fontSize: "13px",
    color: "#5f6b66",
    lineHeight: "1.55",
    marginBottom: "14px",
  },
  railBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  notFound: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "16px",
    padding: "60px 40px",
    textAlign: "center",
  },
};
