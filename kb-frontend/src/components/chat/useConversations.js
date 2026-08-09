import { useState, useEffect } from "react";
import { supabase } from "../../api/auth";

export function useConversations(messages, selectedDocs, sessionId) {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initUser();
  }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      loadConversations(user.id);
    }
  };

  const loadConversations = async (uid) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });

      // Silently ignore "relation does not exist" — table not created yet
      if (error) {
        if (error.code !== "42P01") {
          console.error("Error loading conversations:", error.message);
        }
        return;
      }

      setConversations(data || []);
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  const generateTitle = (msgs) => {
    if (!msgs || msgs.length === 0) return "New Chat";
    const first = msgs.find(m => m.role === "user");
    if (!first) return "New Chat";
    const title = first.content.trim().replace(/\n/g, " ").slice(0, 50);
    return first.content.length > 50 ? title + "…" : title;
  };

  const saveConversation = async (convId = null) => {
    if (messages.length === 0 || !userId) return;

    try {
      const conversationId = convId || currentConversationId || crypto.randomUUID();

      const conversationData = {
        id: conversationId,
        user_id: userId,
        title: generateTitle(messages),
        messages: messages,
        selected_docs: selectedDocs,
        session_id: sessionId,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("conversations")
          .update(conversationData)
          .eq("id", conversationId)
          .eq("user_id", userId);

        if (error && error.code !== "42P01") throw error;
      } else {
        conversationData.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("conversations")
          .insert([conversationData]);

        if (error && error.code !== "42P01") throw error;
        setCurrentConversationId(conversationId);
      }

      await loadConversations(userId);
    } catch (err) {
      console.error("Error saving conversation:", err);
    }
  };

  const loadConversation = (conversation) => {
    setCurrentConversationId(conversation.id);
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
  };

  const deleteConversation = async (conversationId) => {
    if (!window.confirm("Delete this conversation?")) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", userId);

      if (error && error.code !== "42P01") throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  return {
    conversations,
    currentConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    saveConversation,
  };
}
