const PaperclipIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44,11.05l-9.19,9.19a6,6,0,0,1-8.49-8.49l9.19-9.19a4,4,0,0,1,5.66,5.66l-9.2,9.19a2,2,0,0,1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);

export default function ChatInput({
  input, loading, selectedDocs, uploadingFile, fileInputRef,
  onInputChange, onSendMessage, onFileUpload
}) {
  const disabled = loading || selectedDocs.length === 0;
  const canSend = !disabled && input.trim();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSendMessage(e);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        {/* No-doc warning */}
        {selectedDocs.length === 0 && (
          <p style={s.warning}>Select at least one document to start chatting.</p>
        )}

        <form onSubmit={onSendMessage} style={s.bar}>
          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={onFileUpload}
            style={{ display: "none" }}
            accept=".pdf,.txt,.doc,.docx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            style={s.attachBtn}
            title="Upload document"
          >
            {uploadingFile
              ? <span style={s.spinner}>···</span>
              : <PaperclipIcon />
            }
          </button>

          {/* Input */}
          <input
            type="text"
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedDocs.length > 0
                ? "Ask a question about your documents…"
                : "Select documents first…"
            }
            disabled={disabled}
            style={{
              ...s.input,
              ...(disabled ? s.inputDisabled : {}),
            }}
          />

          {/* Send */}
          <button
            type="submit"
            disabled={!canSend}
            style={{
              ...s.sendBtn,
              ...(!canSend ? s.sendDisabled : {}),
            }}
            title="Send (Enter)"
          >
            <SendIcon />
          </button>
        </form>

        <p style={s.hint}>Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    backgroundColor: "var(--bg)",
    borderTop: "1px solid var(--border)",
    padding: "14px 24px 18px",
  },
  inner: {
    maxWidth: "780px",
    margin: "0 auto",
  },
  warning: {
    fontSize: "12px",
    color: "#dc2626",
    marginBottom: "8px",
    textAlign: "center",
  },
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "6px 8px",
    transition: "border-color 0.15s",
  },
  attachBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px",
    background: "none",
    border: "none",
    color: "var(--text-3)",
    cursor: "pointer",
    borderRadius: "6px",
    flexShrink: 0,
    transition: "color 0.15s",
  },
  spinner: {
    fontSize: "12px",
    color: "var(--text-3)",
    letterSpacing: "2px",
  },
  input: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    fontSize: "14px",
    color: "var(--text)",
    padding: "6px 4px",
    minWidth: 0,
  },
  inputDisabled: {
    cursor: "not-allowed",
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    backgroundColor: "var(--accent)",
    color: "var(--accent-fg)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
  sendDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },
  hint: {
    marginTop: "8px",
    fontSize: "11px",
    color: "var(--text-3)",
    textAlign: "center",
  },
};
