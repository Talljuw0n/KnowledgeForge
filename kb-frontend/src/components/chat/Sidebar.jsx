import { useState } from 'react';

export default function Sidebar({
  show, userName, userEmail, conversations, currentConversationId,
  onNewChat, onLoadConversation, onDeleteConversation, onSignOut, onToggleSidebar
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  if (!show) return null;

  const getUserInitials = () => {
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupConversationsByDate = (convs) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    };

    convs.forEach(conv => {
      const convDate = new Date(conv.updatedAt);
      const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());
      
      if (convDay.getTime() === today.getTime()) {
        groups.today.push(conv);
      } else if (convDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(conv);
      } else if (convDate >= lastWeek) {
        groups.lastWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const groupedConvs = groupConversationsByDate(filteredConversations);

  return (
    <div style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>💬</span>
          <span style={styles.logoText}>Chat</span>
        </div>
        <button 
          onClick={onToggleSidebar} 
          style={styles.collapseBtn}
          title="Hide sidebar"
        >
          ☰
        </button>
      </div>

      {/* New Chat Button */}
      <div style={styles.newChatSection}>
        <button onClick={onNewChat} style={styles.newChatBtn}>
          <span style={styles.btnIcon}>➕</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Bar */}
      {conversations.length > 0 && (
        <div style={styles.searchSection}>
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>
      )}

      {/* Chat History */}
      <div style={styles.historySection}>
        {conversations.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>💭</span>
            <p style={styles.emptyText}>No conversations yet</p>
            <p style={styles.emptyHint}>Start a new chat to begin</p>
          </div>
        ) : (
          <>
            {groupedConvs.today.length > 0 && (
              <ConversationGroup
                title="Today"
                conversations={groupedConvs.today}
                currentConversationId={currentConversationId}
                onLoadConversation={onLoadConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}
            {groupedConvs.yesterday.length > 0 && (
              <ConversationGroup
                title="Yesterday"
                conversations={groupedConvs.yesterday}
                currentConversationId={currentConversationId}
                onLoadConversation={onLoadConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}
            {groupedConvs.lastWeek.length > 0 && (
              <ConversationGroup
                title="Last 7 Days"
                conversations={groupedConvs.lastWeek}
                currentConversationId={currentConversationId}
                onLoadConversation={onLoadConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}
            {groupedConvs.older.length > 0 && (
              <ConversationGroup
                title="Older"
                conversations={groupedConvs.older}
                currentConversationId={currentConversationId}
                onLoadConversation={onLoadConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}
          </>
        )}
      </div>

      {/* User Profile Footer */}
      <div style={styles.footer}>
        <div 
          style={styles.profile}
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <div style={styles.avatar}>{getUserInitials()}</div>
          <div style={styles.profileInfo}>
            <p style={styles.profileName}>{userName}</p>
            <p style={styles.profileEmail}>{userEmail}</p>
          </div>
          <span style={styles.menuIcon}>⋮</span>
        </div>

        {/* Profile Menu Dropdown */}
        {showProfileMenu && (
          <div style={styles.profileMenu}>
            <button 
              onClick={() => {
                setShowProfileMenu(false);
                onSignOut();
              }} 
              style={styles.menuItem}
            >
              <span style={styles.menuItemIcon}>🚪</span>
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationGroup({ title, conversations, currentConversationId, onLoadConversation, onDeleteConversation }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div style={styles.group}>
      <h3 style={styles.groupTitle}>{title}</h3>
      <div style={styles.convList}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            style={{
              ...styles.convItem,
              ...(currentConversationId === conv.id ? styles.convItemActive : {}),
              ...(hoveredId === conv.id ? styles.convItemHover : {})
            }}
            onMouseEnter={() => setHoveredId(conv.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              onClick={() => onLoadConversation(conv)}
              style={styles.convContent}
            >
              <div style={styles.convHeader}>
                <span style={styles.convIcon}>💬</span>
                <p style={styles.convTitle}>{conv.title}</p>
              </div>
              {conv.selectedDocs && conv.selectedDocs.length > 0 && (
                <div style={styles.convMeta}>
                  <span style={styles.docCount}>
                    📄 {conv.selectedDocs.length} document{conv.selectedDocs.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            {hoveredId === conv.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                style={styles.deleteBtn}
                title="Delete conversation"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "280px",
    backgroundColor: "#111827",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    borderRight: "1px solid #1f2937"
  },
  
  header: {
    padding: "20px",
    borderBottom: "1px solid #1f2937",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  logoIcon: {
    fontSize: "24px"
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: "-0.5px"
  },
  collapseBtn: {
    padding: "6px 10px",
    background: "none",
    border: "none",
    fontSize: "20px",
    color: "#9ca3af",
    cursor: "pointer",
    borderRadius: "6px",
    transition: "all 0.2s"
  },

  newChatSection: {
    padding: "16px",
    borderBottom: "1px solid #1f2937"
  },
  newChatBtn: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s"
  },
  btnIcon: {
    fontSize: "16px"
  },

  searchSection: {
    padding: "12px 16px",
    borderBottom: "1px solid #1f2937"
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#1f2937",
    padding: "8px 12px",
    borderRadius: "8px"
  },
  searchIcon: {
    fontSize: "14px",
    opacity: 0.6
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: "14px"
  },

  historySection: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center"
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "12px",
    opacity: 0.5
  },
  emptyText: {
    margin: "0 0 4px 0",
    fontSize: "14px",
    fontWeight: "500",
    color: "#9ca3af"
  },
  emptyHint: {
    margin: 0,
    fontSize: "12px",
    color: "#6b7280"
  },

  group: {
    marginBottom: "8px"
  },
  groupTitle: {
    margin: "0 0 6px 0",
    padding: "8px 16px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  convList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  convItem: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    margin: "0 8px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s",
    backgroundColor: "transparent"
  },
  convItemHover: {
    backgroundColor: "#1f2937"
  },
  convItemActive: {
    backgroundColor: "#1e40af"
  },
  convContent: {
    flex: 1,
    minWidth: 0
  },
  convHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px"
  },
  convIcon: {
    fontSize: "14px",
    opacity: 0.8
  },
  convTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "500",
    color: "#e5e7eb",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1
  },
  convMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  docCount: {
    fontSize: "11px",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  deleteBtn: {
    padding: "6px",
    background: "none",
    border: "none",
    fontSize: "14px",
    cursor: "pointer",
    opacity: 0.6,
    borderRadius: "4px",
    transition: "all 0.2s"
  },

  footer: {
    padding: "12px",
    borderTop: "1px solid #1f2937",
    backgroundColor: "#0f172a",
    position: "relative"
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    minWidth: 0
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    flexShrink: 0
  },
  profileInfo: {
    flex: 1,
    minWidth: 0
  },
  profileName: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "600",
    color: "#e5e7eb",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  profileEmail: {
    margin: "2px 0 0 0",
    fontSize: "11px",
    color: "#6b7280",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  menuIcon: {
    fontSize: "20px",
    color: "#9ca3af",
    fontWeight: "bold",
    flexShrink: 0
  },
  profileMenu: {
    position: "absolute",
    bottom: "72px",
    left: "12px",
    right: "12px",
    backgroundColor: "#1f2937",
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
    border: "1px solid #374151"
  },
  menuItem: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "transparent",
    border: "none",
    color: "#e5e7eb",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: "all 0.2s",
    textAlign: "left"
  },
  menuItemIcon: {
    fontSize: "16px"
  }
};