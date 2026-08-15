import os
import json
import logging
from groq import Groq
from pathlib import Path
from typing import List
from datetime import date

from app.services.vector_store import FAISSVectorStore

logger = logging.getLogger(__name__)

MAX_CONTEXT_CHARS = 40_000


def _get_context(user_id: str, document_ids: List[str]) -> str:
    store_path = Path(f"data/vector_store/{user_id}")
    if not store_path.exists():
        return ""
    store = FAISSVectorStore(dim=384, store_path=store_path)
    store.load()
    chunks = store.get_by_document_ids(document_ids)
    if not chunks:
        return ""
    parts = [c.get("text", "") for c in chunks if c.get("text")]
    context = "\n\n---\n\n".join(parts)
    return context[:MAX_CONTEXT_CHARS]


def _groq_json(system: str, prompt: str) -> dict:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
        timeout=60,
    )
    return json.loads(response.choices[0].message.content)


def generate_quiz(user_id: str, document_ids: List[str], num_questions: int = 10, question_type: str = "mixed") -> dict:
    context = _get_context(user_id, document_ids)
    if not context:
        raise ValueError("No content found for the selected documents.")

    type_instruction = {
        "mcq":          "All questions must be multiple choice (4 options each).",
        "true_false":   "All questions must be True/False.",
        "short_answer": "All questions must be short answer.",
        "mixed":        "Use a mix of multiple choice, true/false, and short answer.",
    }.get(question_type, "Use a mix of multiple choice, true/false, and short answer.")

    system = "You are an expert educator. Generate quiz questions from study material. Return only valid JSON."

    prompt = f"""Generate exactly {num_questions} quiz questions from the study material below.
{type_instruction}

Study Material:
{context}

Return JSON exactly like this:
{{
  "title": "Quiz: [topic from material]",
  "questions": [
    {{
      "id": 1,
      "type": "mcq",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "A",
      "explanation": "..."
    }},
    {{
      "id": 2,
      "type": "true_false",
      "question": "...",
      "options": ["True", "False"],
      "correct": "True",
      "explanation": "..."
    }},
    {{
      "id": 3,
      "type": "short_answer",
      "question": "...",
      "sample_answer": "...",
      "key_points": ["...", "..."]
    }}
  ]
}}"""

    result = _groq_json(system, prompt)
    if "questions" not in result:
        raise ValueError("Unexpected response format from AI.")
    return result


def generate_flashcards(user_id: str, document_ids: List[str], num_cards: int = 15) -> dict:
    context = _get_context(user_id, document_ids)
    if not context:
        raise ValueError("No content found for the selected documents.")

    system = "You are an expert educator. Create flashcards from study material. Return only valid JSON."

    prompt = f"""Create exactly {num_cards} flashcards from the study material below.
Focus on key terms, definitions, concepts, processes, and important facts.

Study Material:
{context}

Return JSON exactly like this:
{{
  "title": "Flashcards: [topic]",
  "flashcards": [
    {{
      "id": 1,
      "front": "Question or term",
      "back": "Answer or definition",
      "category": "Definition"
    }}
  ]
}}

Category must be one of: Definition, Concept, Formula, Process, Fact, Example"""

    result = _groq_json(system, prompt)
    if "flashcards" not in result:
        raise ValueError("Unexpected response format from AI.")
    return result


def extract_key_concepts(user_id: str, document_ids: List[str]) -> dict:
    context = _get_context(user_id, document_ids)
    if not context:
        raise ValueError("No content found for the selected documents.")

    system = "You are an expert educator. Extract key study information from material. Return only valid JSON."

    prompt = f"""Analyse the study material below and extract everything a student needs to know.

Study Material:
{context}

Return JSON exactly like this:
{{
  "title": "[Subject/Topic name]",
  "summary": "3-4 sentence overview of the entire content.",
  "key_terms": [
    {{ "term": "...", "definition": "..." }}
  ],
  "main_topics": ["Topic 1", "Topic 2"],
  "likely_exam_questions": ["Question 1?", "Question 2?"]
}}

Generate 8-12 key terms, 4-6 main topics, and 5-8 likely exam questions."""

    result = _groq_json(system, prompt)
    if "key_terms" not in result:
        raise ValueError("Unexpected response format from AI.")
    return result


def generate_study_plan(user_id: str, document_ids: List[str], exam_date: str, hours_per_day: float = 2.0) -> dict:
    context = _get_context(user_id, document_ids)
    if not context:
        raise ValueError("No content found for the selected documents.")

    today = date.today()
    try:
        exam_dt = date.fromisoformat(exam_date)
        days_available = max((exam_dt - today).days, 1)
    except ValueError:
        days_available = 7

    system = "You are an expert study coach. Create personalised study plans. Return only valid JSON."

    prompt = f"""Create a {days_available}-day study plan. The student has {hours_per_day} hours per day. Exam date: {exam_date}.

Study Material:
{context}

Return JSON exactly like this:
{{
  "title": "Study Plan: [Topic]",
  "total_days": {days_available},
  "daily_hours": {hours_per_day},
  "plan": [
    {{
      "day": 1,
      "focus": "Main focus for this day",
      "tasks": ["Task 1", "Task 2", "Task 3"],
      "topics": ["Sub-topic A", "Sub-topic B"],
      "tip": "One practical tip for this day"
    }}
  ],
  "general_tips": ["Tip 1", "Tip 2", "Tip 3"]
}}

Cover ALL {days_available} days. Progress from foundations to advanced. Reserve the last 1-2 days for review."""

    result = _groq_json(system, prompt)
    if "plan" not in result:
        raise ValueError("Unexpected response format from AI.")
    return result


def generate_active_recall_question(user_id: str, document_ids: List[str], previous_questions: List[str] = None) -> dict:
    context = _get_context(user_id, document_ids)
    if not context:
        raise ValueError("No content found for the selected documents.")

    avoid = ""
    if previous_questions:
        avoid = f"\nAvoid repeating these topics already covered: {', '.join(previous_questions[-5:])}"

    system = "You are a Socratic tutor. Generate one recall question at a time. Return only valid JSON."

    prompt = f"""From the study material below, generate ONE question to test a student's understanding.
The question should require the student to recall and explain a concept in their own words.{avoid}

Study Material:
{context}

Return JSON exactly like this:
{{
  "question": "Your question here?",
  "topic": "The topic this question tests",
  "hints": ["Hint 1 if they're stuck", "Hint 2"],
  "model_answer": "A complete model answer covering key points."
}}"""

    return _groq_json(system, prompt)


def evaluate_recall_answer(question: str, student_answer: str, model_answer: str) -> dict:
    system = "You are a supportive tutor evaluating a student's answer. Return only valid JSON."

    prompt = f"""Evaluate this student's answer.

Question: {question}
Model Answer: {model_answer}
Student's Answer: {student_answer}

Return JSON exactly like this:
{{
  "score": 3,
  "max_score": 5,
  "feedback": "Encouraging 2-3 sentence feedback explaining what they got right and what to improve.",
  "missed_points": ["Point they missed 1", "Point they missed 2"],
  "correct_points": ["What they got right"]
}}

Score 1-5: 1=completely wrong, 3=partially correct, 5=fully correct."""

    return _groq_json(system, prompt)
