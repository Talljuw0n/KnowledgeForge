import { X, UploadCloud, File, Check } from "lucide-react";

export default function DocumentManager({
  show, documents, selectedDocs, uploadingFile,
  onClose, onToggleDocument, onSelectAll, onDeselectAll, onFileUpload, fileInputRef
}) {
  if (!show) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Documents</h2>
            <p style={s.subtitle}>{selectedDocs.length} of {documents.length} selected</p>
          </div>
          <button onClick={onClose} style={s.closeBtn}>
            <X size={15} />
          </button>
        </div>

        {/* Upload area */}
        <div style={s.uploadSection}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={onFileUpload}
            style={{ display: "none" }}
            accept=".pdf,.txt,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            style={s.uploadArea}
          >
            <UploadCloud size={22} color="#0b5c47" strokeWidth={1.5} />
            <span style={s.uploadLabel}>
              {uploadingFile ? "Uploading…" : "Click to upload a document"}
            </span>
            <span style={s.uploadHint}>PDF, DOCX or TXT</span>
          </button>
        </div>

        {/* Bulk actions */}
        {documents.length > 0 && (
          <div style={s.bulk}>
            <button onClick={onSelectAll} style={s.bulkBtn}>Select all</button>
            <button onClick={onDeselectAll} style={s.bulkBtn}>Clear all</button>
          </div>
        )}

        {/* Document list */}
        <div style={s.list}>
          {documents.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}><File size={24} color="#0b5c47" /></div>
              <p style={s.emptyText}>No documents yet</p>
              <p style={s.emptyHint}>Upload a document to get started</p>
            </div>
          ) : (
            documents.map(doc => {
              const selected = selectedDocs.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  style={{ ...s.docItem, ...(selected ? s.docSelected : {}) }}
                  onClick={() => onToggleDocument(doc.id)}
                >
                  <div style={{ ...s.checkbox, ...(selected ? s.checkboxChecked : {}) }}>
                    {selected && <Check size={10} strokeWidth={3} color="white" />}
                  </div>
                  <div style={s.docIcon}><File size={16} color="#9aa5a0" /></div>
                  <div style={s.docInfo}>
                    <p style={s.docName}>{doc.filename}</p>
                    <p style={s.docDate}>
                      {doc.created_at
                        ? new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onClose} style={s.doneBtn}>Done</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(22,32,28,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(3px)",
  },
  modal: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "520px",
    maxHeight: "82vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 14px 40px rgba(22,32,28,0.07)",
  },
  header: {
    padding: "20px 20px 16px",
    borderBottom: "1px solid #eef1ef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#16201c",
    marginBottom: "3px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#5f6b66",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#7b8681",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "8px",
    display: "flex",
  },
  uploadSection: {
    padding: "16px 20px",
    borderBottom: "1px solid #eef1ef",
  },
  uploadArea: {
    width: "100%",
    padding: "20px",
    border: "1.5px dashed #c6d3cd",
    borderRadius: "12px",
    backgroundColor: "#f9fbfa",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    color: "#5f6b66",
    transition: "border-color 0.15s",
  },
  uploadLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#16201c",
  },
  uploadHint: {
    fontSize: "12px",
    color: "#7b8681",
  },
  bulk: {
    padding: "10px 20px",
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid #eef1ef",
  },
  bulkBtn: {
    padding: "6px 14px",
    backgroundColor: "#f5f7f6",
    border: "1px solid #e3e7e4",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#5f6b66",
    cursor: "pointer",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 16px",
  },
  empty: {
    padding: "40px 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  emptyIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "#dff2ec",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#16201c",
  },
  emptyHint: {
    fontSize: "13px",
    color: "#5f6b66",
  },
  docItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "11px 12px",
    borderRadius: "10px",
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "background-color 0.12s",
    marginBottom: "4px",
  },
  docSelected: {
    backgroundColor: "#f0f5f2",
    borderColor: "#12876a",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    borderRadius: "5px",
    border: "1.5px solid #d9dfdb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.12s",
  },
  checkboxChecked: {
    backgroundColor: "#12876a",
    borderColor: "#12876a",
  },
  docIcon: {
    flexShrink: 0,
    display: "flex",
  },
  docInfo: { flex: 1, minWidth: 0 },
  docName: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#16201c",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginBottom: "2px",
  },
  docDate: {
    fontSize: "11px",
    color: "#7b8681",
  },
  footer: {
    padding: "14px 20px",
    borderTop: "1px solid #eef1ef",
  },
  doneBtn: {
    width: "100%",
    padding: "11px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
};
