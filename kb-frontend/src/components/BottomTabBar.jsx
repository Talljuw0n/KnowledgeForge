import { useNavigate, useLocation } from "react-router-dom";
import { Home, Library, MessageCircle, UploadCloud } from "lucide-react";

const TABS = [
  { key: "home",    label: "Home",    icon: Home,          to: "/home" },
  { key: "library", label: "Library", icon: Library,        to: "/library" },
  { key: "chats",   label: "Chats",   icon: MessageCircle,  to: "/chat" },
  { key: "upload",  label: "Upload",  icon: UploadCloud,    to: "/upload" },
];

export default function BottomTabBar({ activeTab }) {
  const navigate = useNavigate();

  return (
    <nav style={s.bar}>
      {TABS.map(({ key, label, icon: Icon, to }) => {
        const active = activeTab === key;
        return (
          <button key={key} onClick={() => navigate(to)} style={s.tab}>
            <div style={{ ...s.pill, ...(active ? s.pillActive : {}) }}>
              <Icon size={20} color={active ? "#0b5c47" : "#8b958f"} strokeWidth={2} />
            </div>
            <span style={{
              ...s.label,
              color: active ? "#0b5c47" : "#8b958f",
              fontWeight: active ? "700" : "500",
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const s = {
  bar: {
    backgroundColor: "#ffffff",
    borderTop: "1px solid #e3e7e4",
    padding: "8px 6px 18px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
  },
  tab: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    minHeight: "52px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 0",
  },
  pill: {
    width: "46px",
    height: "28px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s",
  },
  pillActive: {
    backgroundColor: "#dff2ec",
  },
  label: {
    fontSize: "11.5px",
    lineHeight: 1,
  },
};
