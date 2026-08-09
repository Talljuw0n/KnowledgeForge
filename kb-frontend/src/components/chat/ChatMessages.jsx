const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5,15H4a2,2,0,0,1-2-2V4A2,2,0,0,1,4,2H15a2,2,0,0,1,2,2V5"/>
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11,4H4a2,2,0,0,0-2,2V18a2,2,0,0,0,2,2H16a2,2,0,0,0,2-2V11"/>
    <path d="M18.5,2.5a2.121,2.121,0,0,1,3,3L12,15l-4,1,1-4Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
    <path d="M10,11v6M14,11v6"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function ChatMessages({
  messages, loading, userName, hoveredMessageId, editingMessageId,
  editingText, followUpSuggestions, messagesEndRef,
  onMessageHover, onCopyMessage, onStartEditing, onSaveEdit,
  onCancelEdit, onDeleteMessage, onEditTextChange, onSuggestionClick
}) {
  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={s.area}>
      {messages.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}><SparkleIcon /></div>
          <h2 style={s.emptyTitle}>How can I help you today?</h2>
          <p style={s.emptyHint}>Select documents and ask any question about them.</p>
        </div>
      ) : (
        <div style={s.list}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className="msg-in"
              style={{
                ...s.row,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
              }}
              onMouseEnter={() => onMessageHover(idx)}
              onMouseLeave={() => onMessageHover(null)}
            >
              {/* Avatar */}
              {msg.role === "assistant" ? (
                <div style={s.aiAvatar}>K</div>
              ) : (
                <div style={s.userAvatar}>{initials}</div>
              )}

              {/* Bubble */}
              <div style={s.bubbleWrap}>
                {editingMessageId === idx ? (
                  <div>
                    <textarea
                      value={editingText}
                      onChange={e => onEditTextChange(e.target.value)}
                      style={s.editArea}
                      rows={3}
                    />
                    <div style={s.editActions}>
                      <button onClick={() => onSaveEdit(idx)} style={s.saveBtn}>Save</button>
                      <button onClick={onCancelEdit} style={s.cancelBtn}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      ...s.bubble,
                      ...(msg.role === "user" ? s.userBubble : s.aiBubble),
                    }}>
                      <p style={s.bubbleText}>{msg.content}</p>
                    </div>

                    {hoveredMessageId === idx && (
                      <div style={{
                        ...s.actions,
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      }}>
                        <button style={s.actionBtn} onClick={() => onCopyMessage(msg.content)} title="Copy">
                          <CopyIcon />
                        </button>
                        {msg.role === "user" && (
                          <button style={s.actionBtn} onClick={() => onStartEditing(idx, msg.content)} title="Edit">
                            <EditIcon />
                          </button>
                        )}
                        <button style={s.actionBtn} onClick={() => onDeleteMessage(idx)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...s.row, flexDirection: "row" }}>
              <div style={s.aiAvatar}>K</div>
              <div style={{ ...s.bubble, ...s.aiBubble }}>
                <div style={s.dots}>
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            </div>
          )}

          {!loading && followUpSuggestions.length > 0 && (
            <div style={s.suggestions}>
              <p style={s.sugLabel}>Suggested follow-ups</p>
              <div style={s.sugList}>
                {followUpSuggestions.map((sug, i) => (
                  <button key={i} style={s.sugBtn} onClick={() => onSuggestionClick(sug)}>
                    {sug}
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

const s = {
  area: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 24px 8px",
  },
  empty: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "10px",
    paddingBottom: "60px",
  },
  emptyIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "var(--accent-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  emptyTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "var(--text)",
    letterSpacing: "-0.3px",
  },
  emptyHint: {
    fontSize: "14px",
    color: "var(--text-2)",
  },
  list: {
    maxWidth: "780px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  row: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
  },
  aiAvatar: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    backgroundColor: "var(--accent)",
    color: "var(--accent-fg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
    marginTop: "2px",
  },
  userAvatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "var(--bg-hover)",
    color: "var(--text-2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    flexShrink: 0,
    marginTop: "2px",
  },
  bubbleWrap: {
    maxWidth: "72%",
    minWidth: 0,
  },
  bubble: {
    padding: "11px 15px",
    borderRadius: "var(--radius)",
  },
  userBubble: {
    backgroundColor: "var(--user-bubble)",
    color: "var(--user-bubble-fg)",
    borderBottomRightRadius: "4px",
  },
  aiBubble: {
    backgroundColor: "var(--ai-bubble)",
    color: "var(--ai-bubble-fg)",
    border: "1px solid var(--border)",
    borderBottomLeftRadius: "4px",
  },
  bubbleText: {
    fontSize: "14px",
    lineHeight: "1.65",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  actions: {
    display: "flex",
    gap: "4px",
    marginTop: "6px",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    padding: "5px 7px",
    backgroundColor: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-2)",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  editArea: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
  },
  editActions: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  saveBtn: {
    padding: "6px 16px",
    backgroundColor: "var(--accent)",
    color: "var(--accent-fg)",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "6px 16px",
    backgroundColor: "var(--bg-subtle)",
    color: "var(--text-2)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  dots: {
    display: "flex",
    gap: "5px",
    padding: "3px 0",
    alignItems: "center",
  },
  suggestions: {
    marginLeft: "40px",
    marginTop: "4px",
  },
  sugLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--text-3)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  sugList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sugBtn: {
    padding: "9px 14px",
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.15s",
  },
};
