import { supabase } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token}`,
  };
}

export async function uploadDocument(file) {
  const headers = await authHeader();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function fetchDocuments() {
  const headers = await authHeader();

  const res = await fetch(`${API_URL}/documents`, {
    headers,
  });

  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(id) {
  const headers = await authHeader();

  const res = await fetch(`${API_URL}/documents/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

export async function sendChatMessage(message, sessionId = null) {
  const headers = await authHeader();
  
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      question: message,
      session_id: sessionId 
    }),
  });

  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

export async function streamChat(message, onChunk) {
  const headers = await authHeader();
  
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) throw new Error("Chat request failed");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      onChunk(decoder.decode(value));
    }
  }
}