import { useState, useEffect } from "react";
import { supabase } from "../../api/auth";

export function useChatLogic(API_URL, messagesEndRef, fileInputRef) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [userName, setUserName] = useState("You");
  const [userEmail, setUserEmail] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState([]);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    getUserInfo();
  }, []);

  const getUserInfo = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log("👤 User info loaded:", user?.email);
  console.log("👤 User metadata:", user?.user_metadata);
  
  if (user) {
    // Check for display_name first, then fall back to email
    const name = user.user_metadata?.display_name || 
                 user.user_metadata?.full_name || 
                 user.user_metadata?.name || 
                 user.email?.split('@')[0] || "You";
    setUserName(name);
    setUserEmail(user.email || "");
    console.log("👤 Display name set to:", name);
  }
};

  const fetchDocuments = async () => {
    console.log("📄 Fetching documents from:", `${API_URL}/api/documents`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("🔐 Session token exists:", !!session?.access_token);
      
      const res = await fetch(`${API_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      console.log("📄 Documents response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        console.log("📄 Documents loaded:", docs.length, "documents");
        console.log("📄 Full document objects:", docs);
        console.log("📄 Document IDs:", docs.map(d => d.id));
        console.log("📄 Document ID types:", docs.map(d => typeof d.id));
        
        // Check if documents have a numeric ID field
        if (docs.length > 0) {
          console.log("📄 First document keys:", Object.keys(docs[0]));
        }
        
        setDocuments(docs);
        setSelectedDocs(docs.map(d => d.id));
      } else {
        console.error("❌ Failed to fetch documents:", res.status);
      }
    } catch (error) {
      console.error("❌ Error fetching documents:", error);
    }
  };

  const toggleDocument = (docId) => {
    console.log("🔄 Toggling document:", docId, "Type:", typeof docId);
    setSelectedDocs(prev => {
      const newDocs = prev.includes(docId) 
        ? prev.filter(id => id !== docId) 
        : [...prev, docId];
      console.log("📝 Selected docs now:", newDocs);
      return newDocs;
    });
  };

  const selectAllDocs = () => {
    const allIds = documents.map(d => d.id);
    console.log("✅ Selecting all documents:", allIds);
    setSelectedDocs(allIds);
  };

  const deselectAllDocs = () => {
    console.log("❌ Deselecting all documents");
    setSelectedDocs([]);
  };

  const generateFollowUpSuggestions = () => {
    setFollowUpSuggestions([
      "Can you explain this in more detail?",
      "What are the key takeaways?",
      "Can you provide an example?"
    ]);
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    alert("Message copied!");
  };

  const startEditingMessage = (messageId, content) => {
    console.log("✏️ Editing message:", messageId);
    setEditingMessageId(messageId);
    setEditingText(content);
  };

  const saveEditedMessage = (messageId) => {
    console.log("💾 Saving edited message:", messageId);
    setMessages(prev => prev.map((msg, idx) => 
      idx === messageId ? { ...msg, content: editingText } : msg
    ));
    setEditingMessageId(null);
    setEditingText("");
  };

  const deleteMessage = (messageId) => {
    if (window.confirm("Delete this message?")) {
      console.log("🗑️ Deleting message:", messageId);
      setMessages(prev => prev.filter((_, idx) => idx !== messageId));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("📤 Uploading file:", file.name, file.size, "bytes");
    setUploadingFile(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);

      console.log("📤 Sending to:", `${API_URL}/api/upload`);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      });

      console.log("📥 Upload response status:", res.status);

      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      console.log("✅ Upload successful:", data);
      
      await fetchDocuments();
      
      if (data.document_id) {
        console.log("➕ Auto-selecting new document:", data.document_id);
        setSelectedDocs(prev => [...prev, data.document_id]);
      }
      
      
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (e, messageText = null) => {
    if (e) e.preventDefault();
    
    const textToSend = messageText || input;
    console.log("=".repeat(60));
    console.log("💬 SENDING MESSAGE");
    console.log("=".repeat(60));
    
    if (!textToSend.trim() || loading) {
      console.warn("⚠️ Message empty or already loading");
      return;
    }


    console.log("📝 Message text:", textToSend);
    console.log("📄 Selected document IDs:", selectedDocs);
    console.log("📄 Selected docs length:", selectedDocs.length);
    console.log("📄 Document ID types:", selectedDocs.map(id => typeof id));
    console.log("🔑 Session ID:", sessionId || "none");

    const userMessage = { role: "user", content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setFollowUpSuggestions([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("🔐 Auth session exists:", !!session);
      console.log("🔐 Access token exists:", !!session?.access_token);
      console.log("🔐 Token length:", session?.access_token?.length || 0);
      
      if (!session?.access_token) {
        throw new Error("Not authenticated. Please sign in again.");
      }

      const requestBody = {
        question: textToSend,
        document_ids: selectedDocs
      };

      if (sessionId) {
        requestBody.session_id = sessionId;
      }

      console.log("📤 REQUEST DETAILS:");
      console.log("   URL:", `${API_URL}/api/chat`);
      console.log("   Method: POST");
      console.log("   Headers:", {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token.substring(0, 20)}...`
      });
      console.log("   Body:", JSON.stringify(requestBody, null, 2));

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log("📥 RESPONSE DETAILS:");
      console.log("   Status:", res.status);
      console.log("   Status Text:", res.statusText);
      console.log("   OK:", res.ok);
      console.log("   Headers:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        let errorData;
        const responseText = await res.text();
        console.error("❌ ERROR RESPONSE (raw):", responseText);
        
        try {
          errorData = JSON.parse(responseText);
          console.error("❌ ERROR RESPONSE (parsed):", JSON.stringify(errorData, null, 2));
        } catch (parseError) {
          console.error("❌ Could not parse error response as JSON");
          errorData = { detail: responseText };
        }
        
        let errorMessage = "Failed to get response";
        if (errorData?.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(e => e.msg || JSON.stringify(e)).join(", ");
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
        
        console.error("❌ Final error message:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("✅ SUCCESS RESPONSE:", JSON.stringify(data, null, 2));
      
      if (data.session_id) {
        console.log("🔑 New session ID:", data.session_id);
        setSessionId(data.session_id);
      }

      const aiMessage = { role: "assistant", content: data.answer, mode: data.mode || "documents" };
      setMessages([...newMessages, aiMessage]);
      console.log("✅ Message added to chat");
      
      generateFollowUpSuggestions();
      console.log("=".repeat(60));
      
    } catch (error) {
      console.error("=".repeat(60));
      console.error("💥 CAUGHT ERROR:");
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
      console.error("=".repeat(60));
      
      setMessages([...newMessages, { 
        role: "assistant", 
        content: `❌ Error: ${error.message || "Something went wrong. Please try again."}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return {
    messages, setMessages, input, setInput, loading, setLoading,
    sessionId, setSessionId, selectedDocs, setSelectedDocs,
    documents, fetchDocuments, toggleDocument, selectAllDocs, deselectAllDocs,
    followUpSuggestions, setFollowUpSuggestions,
    hoveredMessageId, setHoveredMessageId,
    editingMessageId, setEditingMessageId,
    editingText, setEditingText,
    uploadingFile, setUploadingFile,
    userName, userEmail, getUserInitials,
    sendMessage, copyMessage, startEditingMessage, 
    saveEditedMessage, deleteMessage, handleFileUpload
  };
}