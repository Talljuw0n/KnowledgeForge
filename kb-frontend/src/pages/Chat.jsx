import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatThread from "../components/chat/ChatThread";
import DocumentManager from "../components/chat/DocumentManager";
import { useChatLogic } from "../components/chat/useChatLogic";
import { useConversations } from "../components/chat/useConversations";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Chat() {
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Capture location.state once at mount — don't re-read on re-renders
  const pendingDocId = useRef(location.state?.documentId || null);
  const pendingQuestion = useRef(location.state?.question || null);

  const {
    messages, setMessages, input, setInput, loading,
    sessionId, setSessionId, selectedDocs, setSelectedDocs,
    documents, fetchDocuments, toggleDocument, selectAllDocs, deselectAllDocs,
    followUpSuggestions, setFollowUpSuggestions,
    uploadingFile,
    userName, userEmail,
    sendMessage, copyMessage, handleFileUpload,
  } = useChatLogic(API_URL, messagesEndRef, fileInputRef);

  const {
    conversations, currentConversationId,
    loadConversation, startNewConversation,
    deleteConversation, saveConversation,
  } = useConversations(messages, selectedDocs, sessionId);

  const [showDocManager, setShowDocManager] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load documents once at mount
  useEffect(() => { fetchDocuments(); }, []);

  // Pre-fill question from navigation state
  useEffect(() => {
    if (pendingQuestion.current) {
      setInput(pendingQuestion.current);
      pendingQuestion.current = null;
    }
  }, []);

  // After documents load, apply any pre-selected document from navigation state.
  // This must run AFTER fetchDocuments (which auto-selects all docs), so we
  // watch the `documents` array and override once when pendingDocId is set.
  useEffect(() => {
    if (pendingDocId.current && documents.length > 0) {
      const docId = pendingDocId.current;
      const exists = documents.find(d => String(d.id) === String(docId));
      if (exists) setSelectedDocs([docId]);
      pendingDocId.current = null;
    }
  }, [documents]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-save conversation on message change
  useEffect(() => {
    if (messages.length > 0) saveConversation(currentConversationId);
  }, [messages]);

  const handleLoadConversation = (conv) => {
    loadConversation(conv);
    setMessages(conv.messages || []);
    setSelectedDocs(conv.selected_docs || []);
    setSessionId(conv.session_id || null);
    setFollowUpSuggestions([]);
    setDrawerOpen(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setMessages([]);
    setSessionId(null);
    setInput("");
    setFollowUpSuggestions([]);
    setDrawerOpen(false);
  };

  const activeDocNames = documents
    .filter(d => selectedDocs.includes(d.id))
    .map(d => d.filename);

  return (
    <div style={s.root}>
      <Header userName={userName} userEmail={userEmail} />

      <div style={s.body}>
        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div style={s.drawerOverlay} onClick={() => setDrawerOpen(false)} />
        )}

        {/* Sidebar */}
        <aside style={{ ...s.sidebar, ...(drawerOpen ? s.sidebarOpen : {}) }}>
          <ChatSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onNewChat={handleNewConversation}
            onLoadConversation={handleLoadConversation}
            onDeleteConversation={deleteConversation}
          />
        </aside>

        {/* Thread panel */}
        <div style={s.thread}>
          <ChatThread
            messages={messages}
            loading={loading}
            input={input}
            userName={userName}
            selectedDocs={selectedDocs}
            activeDocNames={activeDocNames}
            followUpSuggestions={followUpSuggestions}
            messagesEndRef={messagesEndRef}
            onInputChange={setInput}
            onSend={sendMessage}
            onSuggestionClick={(s_) => { setInput(s_); setFollowUpSuggestions([]); }}
            onCopyMessage={copyMessage}
            onOpenDocManager={() => setShowDocManager(true)}
          />
        </div>
      </div>

      <DocumentManager
        show={showDocManager}
        documents={documents}
        selectedDocs={selectedDocs}
        uploadingFile={uploadingFile}
        onClose={() => setShowDocManager(false)}
        onToggleDocument={toggleDocument}
        onSelectAll={selectAllDocs}
        onDeselectAll={deselectAllDocs}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
      />
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#f5f7f6",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
    maxWidth: "1240px",
    width: "100%",
    margin: "0 auto",
    padding: "26px 28px 40px",
    gap: "24px",
    alignItems: "stretch",
  },
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(22,32,28,0.4)",
    zIndex: 50,
  },
  sidebar: {
    width: "236px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
  },
  sidebarOpen: {
    position: "fixed",
    top: "66px",
    left: 0,
    bottom: 0,
    width: "280px",
    zIndex: 60,
    padding: "12px",
  },
  thread: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
};
