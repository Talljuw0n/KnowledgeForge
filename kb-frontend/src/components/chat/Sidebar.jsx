import { useState } from "react";

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
    <path d="M10,11v6M14,11v6"/>
    <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6"/>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
);

const LogOutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9,21H5a2,2,0,0,1-2-2V5A2,2,0,0,1,5,3H9"/>
    <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Sidebar({
  show, userName, userEmail, conversations, currentConversationId,
  onNewChat, onLoadConversation, onDeleteConversation, onSignOut, onToggleSidebar
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  if (!show) return null;

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = (() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 7);
    const g = { Today: [], Yesterday: [], "Last 7 days": [], Older: [] };

    filtered.forEach(conv => {
      const d = new Date(conv.updatedAt);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (day.getTime() === today.getTime()) g["Today"].push(conv);
      else if (day.getTime() === yesterday.getTime()) g["Yesterday"].push(conv);
      else if (d >= lastWeek) g["Last 7 days"].push(conv);
      else g["Older"].push(conv);
    });
    return g;
  })();

  return (
    <div style={s.sidebar}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span style={s.logoText}>KnowledgeForge</span>
        </div>
        <button onClick={onToggleSidebar} style={s.iconBtn} title="Collapse">
          <ChevronLeftIcon />
        </button>
      </div>

      {/* New chat */}
      <div style={s.newChatWrap}>
        <button onClick={onNewChat} style={s.newChatBtn}>
          <PlusIcon />
          <span>New chat</span>
        </button>
      </div>

      {/* Search */}
      {conversations.length > 0 && (
        <div style={s.searchWrap}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search chats…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
          </div>
        </div>
      )}

      {/* History */}
      <div style={s.history}>
        {conversations.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>No conversations yet</p>
            <p style={s.emptyHint}>Start a new chat above</p>
          </div>
        ) : (
          Object.entries(grouped).map(([group, convs]) =>
            convs.length > 0 && (
              <div key={group} style={s.group}>
                <p style={s.groupLabel}>{group}</p>
                {convs.map(conv => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    active={currentConversationId === conv.id}
                    onLoad={onLoadConversation}
                    onDelete={onDeleteConversation}
                  />
                ))}
              </div>
            )
          )
        )}
      </div>

      {/* Profile footer */}
      <div style={s.footer}>
        <div style={s.profile} onClick={() => setShowProfileMenu(p => !p)}>
          <div style={s.avatar}>{initials}</div>
          <div style={s.profileInfo}>
            <p style={s.profileName}>{userName}</p>
            <p style={s.profileEmail}>{userEmail}</p>
          </div>
        </div>

        {showProfileMenu && (
          <div style={s.menu}>
            <button
              style={s.menuItem}
              onClick={() => { setShowProfileMenu(false); onSignOut(); }}
            >
              <LogOutIcon />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, active, onLoad, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...s.convItem,
        ...(active ? s.convActive : hovered ? s.convHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.convContent} onClick={() => onLoad(conv)}>
        <p style={s.convTitle}>{conv.title}</p>
      </div>
      {hovered && (
        <button
          style={s.convDelete}
          onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
          title="Delete"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

const s = {
  sidebar: {
    width: "256px",
    flexShrink: 0,
    height: "100vh",
    backgroundColor: "var(--sidebar-bg)",
    borderRight: "1px solid var(--sidebar-border)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "16px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--sidebar-border)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },
  logoText: {
    fontSize: "14px",
    fontWeight: "700",
    color: "var(--text)",
    letterSpacing: "-0.2px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "var(--text-3)",
    cursor: "pointer",
    padding: "5px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s",
  },
  newChatWrap: {
    padding: "12px",
    borderBottom: "1px solid var(--sidebar-border)",
  },
  newChatBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "9px 14px",
    backgroundColor: "var(--accent)",
    color: "var(--accent-fg)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  searchWrap: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--sidebar-border)",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--bg-hover)",
    borderRadius: "var(--radius-sm)",
    padding: "7px 10px",
  },
  searchIcon: {
    color: "var(--text-3)",
    display: "flex",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    fontSize: "13px",
    color: "var(--text)",
  },
  history: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 0",
  },
  empty: {
    padding: "40px 16px",
    textAlign: "center",
  },
  emptyText: {
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--text-2)",
    marginBottom: "4px",
  },
  emptyHint: {
    fontSize: "12px",
    color: "var(--text-3)",
  },
  group: {
    marginBottom: "4px",
  },
  groupLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--text-3)",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    padding: "8px 14px 4px",
  },
  convItem: {
    display: "flex",
    alignItems: "center",
    margin: "1px 8px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    transition: "background-color 0.1s",
    minWidth: 0,
  },
  convHover: { backgroundColor: "var(--bg-hover)" },
  convActive: { backgroundColor: "var(--accent-subtle)" },
  convContent: {
    flex: 1,
    padding: "8px 8px",
    minWidth: 0,
  },
  convTitle: {
    fontSize: "13px",
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  convDelete: {
    flexShrink: 0,
    padding: "6px 8px",
    background: "none",
    border: "none",
    color: "var(--text-3)",
    cursor: "pointer",
    display: "flex",
    borderRadius: "6px",
  },
  footer: {
    borderTop: "1px solid var(--sidebar-border)",
    padding: "10px 12px",
    position: "relative",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "var(--accent)",
    color: "var(--accent-fg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  profileEmail: {
    fontSize: "11px",
    color: "var(--text-3)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginTop: "1px",
  },
  menu: {
    position: "absolute",
    bottom: "62px",
    left: "12px",
    right: "12px",
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    boxShadow: "var(--shadow)",
    overflow: "hidden",
  },
  menuItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    background: "none",
    border: "none",
    color: "var(--text)",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    textAlign: "left",
  },
};
