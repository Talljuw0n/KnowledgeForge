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

  const res = await fetch(`${API_URL}/api/documents`, {
    headers,
  });

  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return data.documents || [];
}

export async function deleteDocument(filename) {
  const headers = await authHeader();

  const res = await fetch(`${API_URL}/api/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}
