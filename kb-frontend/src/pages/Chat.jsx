import { useState, useRef, useEffect } from "react";
import { supabase, signOut } from "../api/auth";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/chat/Sidebar";
import ChatMessages from "../components/chat/ChatMessages";
import ChatInput from "../components/chat/ChatInput";
import DocumentManager from "../components/chat/DocumentManager";
import { useChatLogic } from "../components/chat/useChatLogic";
import { useConversations } from "../components/chat/useConversations";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Chat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Chat state and logic
  const {
    messages, setMessages, input, setInput, loading, setLoading,
    sessionId, setSessionId, selectedDocs, setSelectedDocs,
    documents, fetchDocuments, toggleDocument, selectAllDocs, deselectAllDocs,
    followUpSuggestions, setFollowUpSuggestions,
    hoveredMessageId, setHoveredMessageId,
    editingMessageId, setEditingMessageId,
    editingText, setEditingText,
    uploadingFile, setUploadingFile,
    userName, userEmail,
    sendMessage, copyMessage, startEditingMessage, 
    saveEditedMessage, deleteMessage, handleFileUpload
  } = useChatLogic(API_URL, messagesEndRef, fileInputRef);

  // Conversation management
  const {
    conversations,
    currentConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    saveConversation
  } = useConversations(messages, selectedDocs, sessionId);

  const [showSidebar, setShowSidebar] = useState(true);
  const [showDocManager, setShowDocManager] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load initial data
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Auto-save conversation
  useEffect(() => {
    if (messages.length > 0) {
      saveConversation(currentConversationId);
    }
  }, [messages]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleLoadConversation = (conv) => {
  loadConversation(conv);
  setMessages(conv.messages || []); // Handle new structure
  setSelectedDocs(conv.selected_docs || []); // Note: selected_docs (with underscore)
  setSessionId(conv.session_id || null); // Note: session_id (with underscore)
  setFollowUpSuggestions([]);
};

  const handleStartNewConversation = () => {
    startNewConversation();
    setMessages([]);
    setSessionId(null);
    setInput("");
    setFollowUpSuggestions([]);
    // Don't clear selectedDocs - keep current document selection
  };

  return (
    <div style={styles.container}>
      <Sidebar
        show={showSidebar}
        userName={userName}
        userEmail={userEmail}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleStartNewConversation}
        onLoadConversation={handleLoadConversation}
        onDeleteConversation={deleteConversation}
        onSignOut={handleSignOut}
        onToggleSidebar={() => setShowSidebar(false)}
      />

      <div style={styles.mainArea}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {!showSidebar && (
              <button onClick={() => setShowSidebar(true)} style={styles.menuBtn}>
                ☰
              </button>
            )}
            <div>
              <h1 style={styles.title}>KnowledgeForge</h1>
              <p style={styles.subtitle}>
                {selectedDocs.length > 0 
                  ? `${selectedDocs.length} document${selectedDocs.length > 1 ? 's' : ''} selected`
                  : "No documents selected"}
              </p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button 
              onClick={() => setShowDocManager(true)} 
              style={styles.docBtn}
              title="Manage documents"
            >
              📄 Documents ({selectedDocs.length})
            </button>
          </div>
        </div>

        <ChatMessages
          messages={messages}
          loading={loading}
          userName={userName}
          hoveredMessageId={hoveredMessageId}
          editingMessageId={editingMessageId}
          editingText={editingText}
          followUpSuggestions={followUpSuggestions}
          messagesEndRef={messagesEndRef}
          onMessageHover={setHoveredMessageId}
          onCopyMessage={copyMessage}
          onStartEditing={startEditingMessage}
          onSaveEdit={saveEditedMessage}
          onCancelEdit={() => {
            setEditingMessageId(null);
            setEditingText("");
          }}
          onDeleteMessage={deleteMessage}
          onEditTextChange={setEditingText}
          onSuggestionClick={(suggestion) => {
            setInput(suggestion);
            setFollowUpSuggestions([]);
          }}
        />

        <ChatInput
          input={input}
          loading={loading}
          selectedDocs={selectedDocs}
          uploadingFile={uploadingFile}
          fileInputRef={fileInputRef}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          onFileUpload={handleFileUpload}
        />
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

const styles = {
  container: { display: "flex", height: "100vh", backgroundColor: "#f5f5f5" },
  mainArea: { flex: 1, display: "flex", flexDirection: "column" },
  header: {
    backgroundColor: "white", padding: "20px 30px",
    borderBottom: "1px solid #e5e7eb", display: "flex",
    justifyContent: "space-between", alignItems: "center"
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "15px" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  menuBtn: {
    padding: "8px 12px", backgroundColor: "#f3f4f6",
    border: "none", borderRadius: "8px", fontSize: "20px", 
    cursor: "pointer", color: "#374151"
  },
  docBtn: {
    padding: "10px 16px", backgroundColor: "#3b82f6",
    color: "white", border: "none", borderRadius: "8px",
    fontSize: "14px", fontWeight: "600", cursor: "pointer",
    transition: "all 0.2s"
  },
  hideBtn: {
    padding: "8px 16px", backgroundColor: "#f3f4f6",
    border: "none", borderRadius: "8px", fontSize: "13px", 
    cursor: "pointer", color: "#374151", fontWeight: "500"
  },
  title: { margin: 0, fontSize: "22px", color: "#111827", fontWeight: "700" },
  subtitle: { margin: "5px 0 0 0", fontSize: "13px", color: "#6b7280" }
};