from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.services.llm import get_current_user, rate_limit
from app.services import study_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class QuizRequest(BaseModel):
    document_ids: List[str]
    num_questions: int = 10
    question_type: str = "mixed"


class FlashcardRequest(BaseModel):
    document_ids: List[str]
    num_cards: int = 15


class ConceptsRequest(BaseModel):
    document_ids: List[str]


class StudyPlanRequest(BaseModel):
    document_ids: List[str]
    exam_date: str
    hours_per_day: float = 2.0


class RecallQuestionRequest(BaseModel):
    document_ids: List[str]
    previous_questions: Optional[List[str]] = []


class RecallEvalRequest(BaseModel):
    question: str
    student_answer: str
    model_answer: str


def _handle(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Study error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Study feature failed. Please try again.")


@router.post("/study/quiz")
async def generate_quiz(payload: QuizRequest, user=Depends(get_current_user)):
    rate_limit(user.id)
    return _handle(study_service.generate_quiz,
                   user.id, payload.document_ids, payload.num_questions, payload.question_type)


@router.post("/study/flashcards")
async def generate_flashcards(payload: FlashcardRequest, user=Depends(get_current_user)):
    rate_limit(user.id)
    return _handle(study_service.generate_flashcards,
                   user.id, payload.document_ids, payload.num_cards)


@router.post("/study/concepts")
async def extract_concepts(payload: ConceptsRequest, user=Depends(get_current_user)):
    rate_limit(user.id)
    return _handle(study_service.extract_key_concepts,
                   user.id, payload.document_ids)


@router.post("/study/plan")
async def create_study_plan(payload: StudyPlanRequest, user=Depends(get_current_user)):
    rate_limit(user.id)
    return _handle(study_service.generate_study_plan,
                   user.id, payload.document_ids, payload.exam_date, payload.hours_per_day)


@router.post("/study/recall/question")
async def get_recall_question(payload: RecallQuestionRequest, user=Depends(get_current_user)):
    rate_limit(user.id)
    return _handle(study_service.generate_active_recall_question,
                   user.id, payload.document_ids, payload.previous_questions)


@router.post("/study/recall/evaluate")
async def evaluate_recall(payload: RecallEvalRequest, user=Depends(get_current_user)):
    rate_limit(user.id)
    return _handle(study_service.evaluate_recall_answer,
                   payload.question, payload.student_answer, payload.model_answer)
