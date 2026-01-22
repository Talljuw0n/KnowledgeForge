export default function ChatMessages({
  messages, loading, userName, hoveredMessageId, editingMessageId,
  editingText, followUpSuggestions, messagesEndRef,
  onMessageHover, onCopyMessage, onStartEditing, onSaveEdit,
  onCancelEdit, onDeleteMessage, onEditTextChange, onSuggestionClick
}) {
  const getUserInitials = () => {
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div style={styles.messagesArea}>
      {messages.length === 0 ? (
        <div style={styles.empty}>
          <h2 style={styles.emptyTitle}>Welcome, {userName}! 👋</h2>
        </div>
      ) : (
        <div style={styles.messagesList}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.row,
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
              }}
              onMouseEnter={() => onMessageHover(idx)}
              onMouseLeave={() => onMessageHover(null)}
            >
              {msg.role === "assistant" && (
                <div style={styles.aiAvatar}>🤖</div>
              )}

              <div style={styles.wrapper}>
                {editingMessageId === idx ? (
                  <div style={styles.editing}>
                    <textarea
                      value={editingText}
                      onChange={(e) => onEditTextChange(e.target.value)}
                      style={styles.editArea}
                      rows={3}
                    />
                    <div style={styles.editActions}>
                      <button onClick={() => onSaveEdit(idx)} style={styles.saveBtn}>
                        Save
                      </button>
                      <button onClick={onCancelEdit} style={styles.cancelBtn}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        ...styles.bubble,
                        ...(msg.role === "user" ? styles.userBubble : styles.aiBubble)
                      }}
                    >
                      <div style={styles.label}>
                        {msg.role === "user" ? userName : "AI Assistant"}
                      </div>
                      <div style={styles.text}>{msg.content}</div>
                    </div>
                    
                    {hoveredMessageId === idx && (
                      <div style={styles.actions}>
                        <button
                          onClick={() => onCopyMessage(msg.content)}
                          style={styles.actionBtn}
                          title="Copy"
                        >
                          📋
                        </button>
                        {msg.role === "user" && (
                          <button
                            onClick={() => onStartEditing(idx, msg.content)}
                            style={styles.actionBtn}
                            title="Edit"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteMessage(idx)}
                          style={styles.actionBtn}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {msg.role === "user" && (
                <div style={styles.userAvatar}>{getUserInitials()}</div>
              )}
            </div>
          ))}
          
          {loading && (
            <div style={styles.row}>
              <div style={styles.aiAvatar}>🤖</div>
              <div style={{ ...styles.bubble, ...styles.aiBubble }}>
                <div style={styles.label}>AI Assistant</div>
                <div style={styles.typing}>
                  <span style={styles.dot}></span>
                  <span style={styles.dot}></span>
                  <span style={styles.dot}></span>
                </div>
              </div>
            </div>
          )}
          
          {!loading && followUpSuggestions.length > 0 && (
            <div style={styles.suggestions}>
              <p style={styles.sugLabel}>💡 Follow-up questions:</p>
              <div style={styles.sugList}>
                {followUpSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSuggestionClick(suggestion)}
                    style={styles.sugBtn}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

const styles = {
  messagesArea: { flex: 1, overflowY: "auto", padding: "20px" },
  empty: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    height: "100%", textAlign: "center"
  },
  emptyTitle: { fontSize: "28px", color: "#333", margin: "0 0 10px 0" },
  messagesList: { maxWidth: "900px", margin: "0 auto" },
  row: {
    display: "flex", marginBottom: "20px",
    gap: "10px", alignItems: "flex-end"
  },
  wrapper: { maxWidth: "70%", position: "relative" },
  bubble: { padding: "12px 16px", borderRadius: "12px" },
  userBubble: { backgroundColor: "#0084ff", color: "white" },
  aiBubble: {
    backgroundColor: "white", color: "#333",
    border: "1px solid #e0e0e0"
  },
  label: {
    fontSize: "11px", fontWeight: "600",
    marginBottom: "5px", opacity: 0.8
  },
  text: { fontSize: "15px", lineHeight: "1.5", whiteSpace: "pre-wrap" },
  aiAvatar: {
    width: "35px", height: "35px", borderRadius: "50%",
    backgroundColor: "#f0f0f0", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize: "20px", flexShrink: 0
  },
  userAvatar: {
    width: "35px", height: "35px", borderRadius: "50%",
    backgroundColor: "#0084ff", color: "white",
    display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "14px",
    fontWeight: "bold", flexShrink: 0
  },
  actions: { display: "flex", gap: "4px", marginTop: "6px" },
  actionBtn: {
    padding: "4px 8px", backgroundColor: "#f0f0f0",
    border: "none", borderRadius: "4px", fontSize: "12px",
    cursor: "pointer", transition: "background-color 0.2s"
  },
  editing: { width: "100%" },
  editArea: {
    width: "100%", padding: "10px", fontSize: "15px",
    border: "2px solid #0084ff", borderRadius: "8px",
    resize: "vertical", fontFamily: "inherit"
  },
  editActions: { display: "flex", gap: "8px", marginTop: "8px" },
  saveBtn: {
    padding: "6px 16px", backgroundColor: "#0084ff",
    color: "white", border: "none", borderRadius: "6px",
    fontSize: "13px", fontWeight: "500", cursor: "pointer"
  },
  cancelBtn: {
    padding: "6px 16px", backgroundColor: "#f0f0f0",
    color: "#333", border: "none", borderRadius: "6px",
    fontSize: "13px", fontWeight: "500", cursor: "pointer"
  },
  typing: { display: "flex", gap: "4px", padding: "5px 0" },
  dot: {
    width: "8px", height: "8px", borderRadius: "50%",
    backgroundColor: "#0084ff",
    animation: "typing 1.4s infinite ease-in-out"
  },
  suggestions: { maxWidth: "70%", marginTop: "15px", marginLeft: "45px" },
  sugLabel: {
    margin: "0 0 8px 0", fontSize: "12px",
    fontWeight: "600", color: "#666"
  },
  sugList: { display: "flex", flexDirection: "column", gap: "6px" },
  sugBtn: {
    padding: "10px 14px", backgroundColor: "white",
    border: "1px solid #e0e0e0", borderRadius: "8px",
    fontSize: "13px", color: "#333", cursor: "pointer",
    textAlign: "left", transition: "all 0.2s"
  }
};