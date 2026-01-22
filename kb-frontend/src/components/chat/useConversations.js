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
        .from('conversations')
        .select('*')
        .eq('user_id', uid) // Only get THIS user's conversations
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setConversations(data || []);
      console.log(`✅ Loaded ${data?.length || 0} conversations for user`);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const generateTitle = (messages) => {
    if (!messages || messages.length === 0) return "New Chat";
    
    const firstUserMessage = messages.find(m => m.role === "user");
    if (!firstUserMessage) return "New Chat";
    
    let title = firstUserMessage.content
      .trim()
      .replace(/\n/g, ' ')
      .slice(0, 50);
    
    if (firstUserMessage.content.length > 50) {
      title += "...";
    }
    
    return title;
  };

  const saveConversation = async (convId = null) => {
    if (messages.length === 0 || !userId) return;

    try {
      const conversationId = convId || currentConversationId || crypto.randomUUID();
      
      const conversationData = {
        id: conversationId,
        user_id: userId, // IMPORTANT: Save with user ID
        title: generateTitle(messages),
        messages: messages,
        selected_docs: selectedDocs,
        session_id: sessionId,
        updated_at: new Date().toISOString()
      };

      // Check if conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('conversations')
          .update(conversationData)
          .eq('id', conversationId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new
        conversationData.created_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('conversations')
          .insert([conversationData]);

        if (error) throw error;
        setCurrentConversationId(conversationId);
      }

      // Reload conversations
      await loadConversations(userId);
      
    } catch (error) {
      console.error("Error saving conversation:", error);
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
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId); // Only delete if it belongs to this user

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
      
      console.log("✅ Conversation deleted");
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  return {
    conversations,
    currentConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    saveConversation
  };
}