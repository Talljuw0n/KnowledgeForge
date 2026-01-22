export default function DocumentManager({
  show,
  documents,
  selectedDocs,
  uploadingFile,
  onClose,
  onToggleDocument,
  onSelectAll,
  onDeselectAll,
  onFileUpload,
  fileInputRef
}) {
  if (!show) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Manage Documents</h2>
            <p style={styles.subtitle}>
              {selectedDocs.length} of {documents.length} selected
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {/* Upload Section */}
        <div style={styles.uploadSection}>
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
            style={styles.uploadBtn}
          >
            {uploadingFile ? (
              <>
                <span style={styles.spinner}>⏳</span>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Upload New Document</span>
              </>
            )}
          </button>
        </div>

        {/* Bulk Actions */}
        {documents.length > 0 && (
          <div style={styles.bulkActions}>
            <button onClick={onSelectAll} style={styles.bulkBtn}>
              ✓ Select All
            </button>
            <button onClick={onDeselectAll} style={styles.bulkBtn}>
              ✕ Clear All
            </button>
          </div>
        )}

        {/* Documents List */}
        <div style={styles.documentsList}>
          {documents.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>📁</span>
              <p style={styles.emptyText}>No documents yet</p>
              <p style={styles.emptyHint}>Upload your first document to get started</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  ...styles.docItem,
                  ...(selectedDocs.includes(doc.id) ? styles.docItemSelected : {})
                }}
                onClick={() => onToggleDocument(doc.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={() => onToggleDocument(doc.id)}
                  style={styles.checkbox}
                />
                <span style={styles.docIcon}>📄</span>
                <div style={styles.docInfo}>
                  <p style={styles.docName}>{doc.filename}</p>
                  <p style={styles.docDate}>
                    {doc.created_at 
                      ? new Date(doc.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Unknown date'}
                  </p>
                </div>
                {selectedDocs.includes(doc.id) && (
                  <span style={styles.checkmark}>✓</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.doneBtn}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)"
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
  },
  header: {
    padding: "24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280"
  },
  closeBtn: {
    padding: "8px",
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    borderRadius: "6px",
    color: "#6b7280",
    transition: "all 0.2s"
  },
  uploadSection: {
    padding: "16px 24px",
    borderBottom: "1px solid #e5e7eb"
  },
  uploadBtn: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.2s"
  },
  spinner: {
    animation: "spin 1s linear infinite"
  },
  bulkActions: {
    padding: "16px 24px",
    display: "flex",
    gap: "12px",
    borderBottom: "1px solid #e5e7eb"
  },
  bulkBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    color: "#374151",
    transition: "all 0.2s"
  },
  documentsList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 24px"
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center"
  },
  emptyIcon: {
    fontSize: "64px",
    marginBottom: "16px",
    opacity: 0.5
  },
  emptyText: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#374151"
  },
  emptyHint: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280"
  },
  docItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    backgroundColor: "#f9fafb",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "8px"
  },
  docItemSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6"
  },
  checkbox: {
    width: "20px",
    height: "20px",
    cursor: "pointer",
    accentColor: "#3b82f6"
  },
  docIcon: {
    fontSize: "24px"
  },
  docInfo: {
    flex: 1,
    minWidth: 0
  },
  docName: {
    margin: "0 0 4px 0",
    fontSize: "14px",
    fontWeight: "500",
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  docDate: {
    margin: 0,
    fontSize: "12px",
    color: "#6b7280"
  },
  checkmark: {
    fontSize: "20px",
    color: "#3b82f6"
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e5e7eb"
  },
  doneBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#111827",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  }
};