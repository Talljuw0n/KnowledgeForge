import { File, Copy } from "lucide-react";

function UserAvatar({ userName }) {
  const initials = (userName || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={s.userAvatar}>{initials}</div>
  );
}

function AssistantAvatar() {
  return <div style={s.assistantAvatar}>KF</div>;
}

function TypingDots() {
  return (
    <div style={s.typingBubble}>
      <div style={s.dots}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function MessageRow({ msg, idx, userName, onCopy }) {
  const isUser = msg.role === "user";
  return (
    <div style={s.msgRow} className="msg-in">
      {/* Avatar */}
      {isUser ? <UserAvatar userName={userName} /> : <AssistantAvatar />}

      {/* Bubble + actions */}
      <div style={s.bubbleCol}>
        <div style={isUser ? s.userBubble : s.assistantBubble}>
          {msg.content}
        </div>
        {/* Text actions */}
        <div style={s.actions}>
          <button onClick={() => onCopy(msg.content)} style={s.actionBtn}>
            <Copy size={12} style={{ marginRight: "4px" }} />
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatThread({
  messages, loading, input, userName,
  selectedDocs, activeDocNames,
  followUpSuggestions,
  messagesEndRef,
  onInputChange, onSend, onSuggestionClick,
  onCopyMessage, onOpenDocManager,
}) {
  const hasMessages = messages.length > 0;
  const canSend = !loading && input.trim();

  const headerTitle = hasMessages
    ? (messages[0]?.content?.slice(0, 60) + (messages[0]?.content?.length > 60 ? "…" : ""))
    : "New conversation";

  const docSummary = activeDocNames.length > 0
    ? `Answering from ${activeDocNames.length} document${activeDocNames.length !== 1 ? "s" : ""}`
    : "No documents selected";

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend(e);
    }
  };

  return (
    <div style={s.wrap}>
      {/* Thread header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <p style={s.headerTitle}>{headerTitle}</p>
          <p style={s.headerSub}>{docSummary}</p>
        </div>
        <button onClick={onOpenDocManager} style={s.changeDocsBtn}>
          Change documents
        </button>
      </div>

      {/* Messages */}
      <div style={s.messages}>
        {!hasMessages && (
          <div style={s.emptyThread}>
            <div style={s.emptyIcon}>
              <File size={24} color="#0b5c47" />
            </div>
            <p style={s.emptyTitle}>What would you like to know?</p>
            <p style={s.emptySub}>
              {selectedDocs.length > 0
                ? "Ask a question about your selected documents."
                : "Ask anything — or select documents to get answers from them."}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageRow
            key={idx}
            msg={msg}
            idx={idx}
            userName={userName}
            onCopy={onCopyMessage}
          />
        ))}

        {loading && (
          <div style={s.msgRow}>
            <AssistantAvatar />
            <TypingDots />
          </div>
        )}

        {/* Follow-up suggestions */}
        {followUpSuggestions.length > 0 && !loading && (
          <div style={s.suggestions}>
            {followUpSuggestions.map(sug => (
              <button
                key={sug}
                onClick={() => onSuggestionClick(sug)}
                style={s.sugChip}
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div style={s.composer}>
        <form onSubmit={onSend} style={s.composerRow}>
          <input
            type="text"
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question, share an idea, or anything…"
            disabled={loading}
            style={s.composerInput}
          />
          <button
            type="submit"
            disabled={!canSend}
            style={{ ...s.sendBtn, ...(!canSend ? s.sendDisabled : {}) }}
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e3e7e4",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #eef1ef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
    gap: "16px",
  },
  headerLeft: {
    minWidth: 0,
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#16201c",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerSub: {
    fontSize: "13px",
    color: "#7b8681",
    marginTop: "2px",
  },
  changeDocsBtn: {
    flexShrink: 0,
    backgroundColor: "#f5f7f6",
    border: "1px solid #e3e7e4",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#3d4a45",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "26px 24px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  emptyThread: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 24px",
    textAlign: "center",
    gap: "10px",
  },
  emptyIcon: {
    width: "48px",
    height: "48px",
    backgroundColor: "#dff2ec",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  emptyTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#16201c",
  },
  emptySub: {
    fontSize: "15px",
    color: "#5f6b66",
  },
  msgRow: {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#eef1ef",
    color: "#3d4a45",
    fontSize: "12px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  assistantAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#12876a",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleCol: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
    flex: 1,
  },
  userBubble: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "14px",
    padding: "14px 18px",
    fontSize: "15.5px",
    lineHeight: "1.68",
    color: "#16201c",
    display: "inline-block",
  },
  assistantBubble: {
    backgroundColor: "#f7faf8",
    border: "1px solid #eaf0ed",
    borderRadius: "14px",
    padding: "16px 18px",
    fontSize: "15.5px",
    lineHeight: "1.68",
    color: "#16201c",
    whiteSpace: "pre-wrap",
  },
  typingBubble: {
    backgroundColor: "#f7faf8",
    border: "1px solid #eaf0ed",
    borderRadius: "14px",
    padding: "16px 18px",
    display: "inline-flex",
  },
  dots: {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    height: "20px",
  },
  actions: {
    display: "flex",
    gap: "12px",
  },
  actionBtn: {
    background: "none",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    color: "#7b8681",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    transition: "color 0.12s",
  },
  suggestions: {
    paddingLeft: "46px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  sugChip: {
    backgroundColor: "#f5f7f6",
    border: "1px solid #e3e7e4",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "13px",
    color: "#3d4a45",
    cursor: "pointer",
    transition: "border-color 0.12s",
  },
  composer: {
    flexShrink: 0,
    borderTop: "1px solid #eef1ef",
    padding: "18px 24px 22px",
    backgroundColor: "#ffffff",
  },
  noDocWarn: {
    fontSize: "12px",
    color: "#a3342a",
    marginBottom: "10px",
    textAlign: "center",
  },
  composerRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  composerInput: {
    flex: 1,
    padding: "13px 16px",
    fontSize: "15px",
    border: "1px solid #d9dfdb",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#16201c",
    outline: "none",
    minWidth: 0,
    transition: "border-color 0.15s",
  },
  sendBtn: {
    flexShrink: 0,
    padding: "0 22px",
    height: "46px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  sendDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};
