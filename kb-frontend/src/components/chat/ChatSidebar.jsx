import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export default function ChatSidebar({
  conversations, currentConversationId,
  onNewChat, onLoadConversation, onDeleteConversation,
}) {
  const grouped = groupByDate(conversations);

  return (
    <div style={s.wrap}>
      <button onClick={onNewChat} style={s.newBtn}>
        <Plus size={15} strokeWidth={2} />
        New chat
      </button>

      <div style={s.list}>
        {conversations.length === 0 ? (
          <p style={s.empty}>No conversations yet</p>
        ) : (
          Object.entries(grouped).map(([label, convs]) =>
            convs.length > 0 && (
              <div key={label} style={s.group}>
                <p style={s.groupLabel}>{label}</p>
                {convs.map(conv => (
                  <ConvRow
                    key={conv.id}
                    conv={conv}
                    active={currentConversationId === conv.id}
                    onLoad={() => onLoadConversation(conv)}
                    onDelete={() => onDeleteConversation(conv.id)}
                  />
                ))}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}

function ConvRow({ conv, active, onLoad, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...s.convRow,
        ...(active ? s.convActive : hovered ? s.convHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button onClick={onLoad} style={s.convTitle}>
        {conv.title || "Untitled"}
      </button>
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={s.deleteBtn}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function groupByDate(convs) {
  const now = new Date();
  const today = startOf(now);
  const yesterday = startOf(now, -1);
  const lastWeek = startOf(now, -7);

  const g = { Today: [], Yesterday: [], "Last 7 days": [], Older: [] };
  convs.forEach(conv => {
    // Supabase returns updated_at (snake_case)
    const d = new Date(conv.updated_at || conv.updatedAt);
    const day = startOf(d);
    if (day >= today) g.Today.push(conv);
    else if (day >= yesterday) g.Yesterday.push(conv);
    else if (d >= lastWeek) g["Last 7 days"].push(conv);
    else g.Older.push(conv);
  });
  return g;
}

function startOf(date, offsetDays = 0) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
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
  newBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    margin: "12px",
    padding: "11px 14px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background-color 0.12s",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0 12px",
  },
  empty: {
    padding: "24px 16px",
    fontSize: "13px",
    color: "#9aa5a0",
    textAlign: "center",
  },
  group: {
    marginBottom: "4px",
  },
  groupLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#9aa5a0",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "10px 16px 4px",
  },
  convRow: {
    display: "flex",
    alignItems: "center",
    margin: "0 8px 2px",
    borderRadius: "9px",
    transition: "background-color 0.1s",
    overflow: "hidden",
  },
  convActive: {
    backgroundColor: "#f0f5f2",
  },
  convHover: {
    backgroundColor: "#f9fbfa",
  },
  convTitle: {
    flex: 1,
    background: "none",
    border: "none",
    padding: "10px 16px",
    fontSize: "14px",
    color: "#16201c",
    fontWeight: "inherit",
    cursor: "pointer",
    textAlign: "left",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  deleteBtn: {
    flexShrink: 0,
    padding: "10px 10px",
    background: "none",
    border: "none",
    color: "#9aa5a0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
};
