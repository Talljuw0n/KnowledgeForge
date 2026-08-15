import { supabase } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token}`,
  };
}

async function extractError(res, fallback) {
  try {
    const data = await res.json();
    const d = data.detail;
    if (!d) return fallback;
    if (Array.isArray(d)) return d.map(e => e.msg || JSON.stringify(e)).join("; ");
    return String(d);
  } catch {
    return fallback;
  }
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

  if (!res.ok) throw new Error(await extractError(res, "Upload failed"));
  return res.json();
}

export async function pollDocumentStatus(documentId, onStatus) {
  const headers = await authHeader();
  const interval = 3000;

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/documents/${documentId}/status`, { headers });
        const data = await res.json();
        onStatus(data.status, data.elapsed_seconds);
        if (data.status === "ready") return resolve(data);
        if (data.status === "failed") return reject(new Error(data.error || "Processing failed"));
        setTimeout(check, interval);
      } catch (e) {
        // network blip — keep polling
        setTimeout(check, interval);
      }
    };
    check();
  });
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

export async function generateQuiz(documentIds, numQuestions = 10, questionType = "mixed") {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}/api/study/quiz`, {
    method: "POST", headers,
    body: JSON.stringify({ document_ids: documentIds, num_questions: numQuestions, question_type: questionType }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to generate quiz"));
  return res.json();
}

export async function generateFlashcards(documentIds, numCards = 15) {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}/api/study/flashcards`, {
    method: "POST", headers,
    body: JSON.stringify({ document_ids: documentIds, num_cards: numCards }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to generate flashcards"));
  return res.json();
}

export async function extractConcepts(documentIds) {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}/api/study/concepts`, {
    method: "POST", headers,
    body: JSON.stringify({ document_ids: documentIds }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to extract concepts"));
  return res.json();
}

export async function generateStudyPlan(documentIds, examDate, hoursPerDay = 2) {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}/api/study/plan`, {
    method: "POST", headers,
    body: JSON.stringify({ document_ids: documentIds, exam_date: examDate, hours_per_day: hoursPerDay }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to generate study plan"));
  return res.json();
}

export async function getRecallQuestion(documentIds, previousQuestions = []) {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}/api/study/recall/question`, {
    method: "POST", headers,
    body: JSON.stringify({ document_ids: documentIds, previous_questions: previousQuestions }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to get question"));
  return res.json();
}

export async function evaluateRecallAnswer(question, studentAnswer, modelAnswer) {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}/api/study/recall/evaluate`, {
    method: "POST", headers,
    body: JSON.stringify({ question, student_answer: studentAnswer, model_answer: modelAnswer }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to evaluate answer"));
  return res.json();
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
