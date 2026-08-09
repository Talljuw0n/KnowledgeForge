import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Book, Plus, Search, Home, Library, MessageCircle } from "lucide-react";
import { supabase, signOut } from "../api/auth";

function BrandMark() {
  return (
    <div style={{
      width: 30, height: 30,
      background: "#12876a",
      borderRadius: "9px",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <Book size={17} color="white" strokeWidth={2.2} />
    </div>
  );
}

export default function Header({ userName = "", userEmail = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const path = location.pathname;
  const activeNav =
    path === "/home" ? "home" :
    path === "/library" || path.startsWith("/document") ? "library" :
    path === "/chat" ? "chats" : "";

  const initials = userName
    ? userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const navItems = [
    { key: "home", label: "Home", icon: <Home size={15} />, to: "/home" },
    { key: "library", label: "Library", icon: <Library size={15} />, to: "/library" },
    { key: "chats", label: "Chats", icon: <MessageCircle size={15} />, to: "/chat" },
  ];

  useEffect(() => {
    const updateLastSeen = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header style={s.header}>
      <div style={s.inner}>
        {/* Brand */}
        <button onClick={() => navigate("/home")} style={s.brandBtn}>
          <BrandMark />
          <span style={s.brandName}>KnowledgeForge</span>
        </button>

        {/* Nav */}
        <nav className="header-nav" style={s.nav}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              style={{
                ...s.navItem,
                ...(activeNav === item.key ? s.navActive : s.navInactive),
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Search */}
        <div className="header-search" style={s.searchWrap}>
          <Search size={15} color="#9aa5a0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search your documents"
            style={s.searchInput}
          />
        </div>

        {/* Upload button */}
        <button className="header-upload" onClick={() => navigate("/upload")} style={s.uploadBtn}>
          <Plus size={15} strokeWidth={2} />
          Upload
        </button>

        {/* Avatar */}
        <div style={s.avatarWrap}>
          <button
            onClick={() => setAvatarMenuOpen(o => !o)}
            style={s.avatar}
            title={userName || "Account"}
          >
            {initials}
          </button>
          {avatarMenuOpen && (
            <div style={s.avatarMenu} onClick={() => setAvatarMenuOpen(false)}>
              <div style={s.avatarMenuInfo}>
                <p style={s.avatarMenuName}>{userName}</p>
                <p style={s.avatarMenuEmail}>{userEmail}</p>
              </div>
              <div style={s.avatarMenuDivider} />
              <button onClick={handleSignOut} style={s.avatarMenuItem}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const s = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e3e7e4",
    height: "66px",
  },
  inner: {
    maxWidth: "1240px",
    margin: "0 auto",
    padding: "0 28px",
    height: "100%",
    display: "flex",
    alignItems: "center",
    gap: "28px",
  },
  brandBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "none",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  },
  brandName: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#16201c",
    letterSpacing: "-0.01em",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },
  navItem: {
    padding: "9px 14px",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.12s, color 0.12s",
  },
  navActive: {
    backgroundColor: "#f0f5f2",
    color: "#0b5c47",
  },
  navInactive: {
    backgroundColor: "transparent",
    color: "#5f6b66",
  },
  searchWrap: {
    flex: 1,
    maxWidth: "320px",
    backgroundColor: "#f5f7f6",
    border: "1px solid #e3e7e4",
    borderRadius: "10px",
    padding: "9px 13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    fontSize: "14px",
    color: "#16201c",
    minWidth: 0,
  },
  uploadBtn: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background-color 0.12s",
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: "#dff2ec",
    color: "#0b5c47",
    fontSize: "13px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(22,32,28,0.08)",
    minWidth: "200px",
    overflow: "hidden",
    zIndex: 200,
  },
  avatarMenuInfo: {
    padding: "14px 16px 12px",
  },
  avatarMenuName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#16201c",
  },
  avatarMenuEmail: {
    fontSize: "12px",
    color: "#7b8681",
    marginTop: "2px",
  },
  avatarMenuDivider: {
    height: "1px",
    backgroundColor: "#f1f4f2",
  },
  avatarMenuItem: {
    width: "100%",
    padding: "11px 16px",
    background: "none",
    border: "none",
    textAlign: "left",
    fontSize: "14px",
    color: "#16201c",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
};
