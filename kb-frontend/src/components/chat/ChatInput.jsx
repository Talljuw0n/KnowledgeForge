export default function ChatInput({
  input, loading, selectedDocs, uploadingFile, fileInputRef,
  onInputChange, onSendMessage, onFileUpload
}) {
  return (
    <div style={styles.inputArea}>
      <div style={styles.toolbar}>
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
          title="Upload document"
        >
          {uploadingFile ? "⏳" : "📎"} {uploadingFile ? "Uploading..." : "Upload"}
        </button>
      </div>

      <form onSubmit={onSendMessage} style={styles.form}>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={
            selectedDocs.length > 0 
              ? "Ask a question about your selected documents..."
              : "Select documents from sidebar first..."
          }
          disabled={loading || selectedDocs.length === 0}
          style={{
            ...styles.input,
            ...(selectedDocs.length === 0 ? styles.inputDisabled : {})
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || selectedDocs.length === 0}
          style={{
            ...styles.sendBtn,
            ...(loading || !input.trim() || selectedDocs.length === 0 ? styles.sendBtnDisabled : {})
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>

      {selectedDocs.length === 0 && (
        <p style={styles.hint}>
          ⚠️ Please select at least one document from the sidebar
        </p>
      )}
    </div>
  );
}

const styles = {
  inputArea: {
    backgroundColor: "white",
    padding: "15px 30px 20px",
    borderTop: "1px solid #e0e0e0"
  },
  toolbar: {
    maxWidth: "900px",
    margin: "0 auto 10px",
    display: "flex",
    gap: "10px"
  },
  uploadBtn: {
    padding: "8px 16px",
    backgroundColor: "#f0f0f0",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#333",
    fontWeight: "500"
  },
  form: {
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    gap: "10px"
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    fontSize: "15px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    outline: "none"
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    cursor: "not-allowed"
  },
  hint: {
    maxWidth: "900px",
    margin: "8px auto 0",
    fontSize: "12px",
    color: "#ff6b6b",
    textAlign: "center"
  },
  sendBtn: {
    padding: "12px 30px",
    backgroundColor: "#0084ff",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600"
  },
  sendBtnDisabled: {
    backgroundColor: "#cccccc",
    cursor: "not-allowed"
  }
};