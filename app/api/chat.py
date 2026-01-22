from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.services.retriever import Retriever
from app.services.llm import LLMService, get_current_user, save_chat, load_chat_history
from app.services.memory import ChatMemory
from app.services.llm import rate_limit
from app.services.llm import validate_query
import uuid

router = APIRouter()

# ✅ Keep in-memory cache for fast access
memory = ChatMemory(max_turns=20, max_tokens=4000)


class QueryRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    document_ids: Optional[List[str]] = None


class SessionCreateRequest(BaseModel):
    title: Optional[str] = None


class SessionUpdateRequest(BaseModel):
    title: str


# ============= CHAT ENDPOINTS =============

@router.post("/chat")
async def chat(
    payload: QueryRequest,
    user = Depends(get_current_user)
):
    """Send a message in a conversation (authenticated)"""
    try:
        user_id = user.id

        # 🛡️ Validate input
        validate_query(payload.question)

        # Apply rate limit
        rate_limit(user_id)
        
        # Generate session_id if not provided
        session_id = payload.session_id or str(uuid.uuid4())
        
        # Create session in memory if it doesn't exist
        if not memory.get_session_metadata(session_id):
            memory.create_session(session_id)
        
        # User-scoped retrieval
        retriever = Retriever(user_id=user_id, top_k=5)
        results = retriever.retrieve(payload.question, document_ids=payload.document_ids)

        if not results:
            answer = "I couldn't find any relevant information. Please upload documents first."
            
            # Save to BOTH memory (fast) and database (persistent)
            memory.add_turn(session_id, payload.question, answer)
            save_chat(
                user_id=user_id,
                question=payload.question,
                answer=answer,
                sources=[],
                session_id=session_id
            )
            
            return {
                "answer": answer,
                "sources": [],
                "session_id": session_id,
                "user_id": user_id
            }

        # Build context and sources
        context_blocks = []
        sources = []

        for r in results:
            text_content = r.get("text", "")
            filename = r.get("filename", "Unknown")
            page = r.get("page", "?")
            
            if text_content:
                context_blocks.append(text_content)
                sources.append(f'{filename} (page {page})')

        if not context_blocks:
            raise HTTPException(
                status_code=500,
                detail="No text content found in retrieval results"
            )

        context = "\n\n".join(context_blocks)
        
        # Generate answer with chat history from DATABASE (cross-session memory)
        llm = LLMService()
        answer = llm.generate_answer(
            question=payload.question,
            context=context,
            user_id=user_id,
            session_id=session_id
        )
        
        # Save to BOTH:
        # 1. Memory (RAM) - fast access for current session
        memory.add_turn(session_id, payload.question, answer)
        
        # 2. Database (Supabase) - persistent storage
        save_chat(
            user_id=user_id,
            question=payload.question,
            answer=answer,
            sources=list(set(sources)),
            session_id=session_id
        )

        return {
            "answer": answer,
            "sources": list(set(sources)),
            "session_id": session_id,
            "conversation_turns": len(memory.get_history(session_id)),
            "user_id": user_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )


# ============= SESSION MANAGEMENT ENDPOINTS =============

@router.post("/sessions/new")
async def create_new_session(
    payload: SessionCreateRequest = None,
    user = Depends(get_current_user)
):
    """Create a new conversation session"""
    session_id = str(uuid.uuid4())
    title = payload.title if payload else None
    memory.create_session(session_id, title)
    
    return {
        "session_id": session_id,
        "metadata": memory.get_session_metadata(session_id),
        "user_id": user.id
    }


@router.get("/sessions")
async def list_sessions(user = Depends(get_current_user)):
    """Get all conversation sessions"""
    return {
        "sessions": memory.list_sessions(),
        "user_id": user.id
    }


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user = Depends(get_current_user)
):
    """Get a specific session with full history"""
    user_id = user.id
    
    # Try to get from memory first (fast)
    metadata = memory.get_session_metadata(session_id)
    history = memory.get_history(session_id)
    
    # If not in memory, load from database (cross-session)
    if not metadata or not history:
        db_history = load_chat_history(user_id, session_id, limit=100)
        
        # Reconstruct memory from database
        memory.create_session(session_id)
        for i in range(0, len(db_history), 2):
            if i + 1 < len(db_history):
                question = db_history[i]["content"]
                answer = db_history[i + 1]["content"]
                memory.add_turn(session_id, question, answer)
        
        metadata = memory.get_session_metadata(session_id)
        history = memory.get_history(session_id)
    
    return {
        "session_id": session_id,
        "metadata": metadata,
        "history": history,
        "user_id": user_id
    }


@router.patch("/sessions/{session_id}")
async def update_session(
    session_id: str,
    payload: SessionUpdateRequest,
    user = Depends(get_current_user)
):
    """Update session title"""
    if not memory.get_session_metadata(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    memory.update_session_title(session_id, payload.title)
    
    return {
        "session_id": session_id,
        "metadata": memory.get_session_metadata(session_id),
        "user_id": user.id
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user = Depends(get_current_user)
):
    """Delete a conversation session"""
    if not memory.get_session_metadata(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    memory.delete_session(session_id)
    
    # Also delete from database
    from app.services.supabase_client import supabase
    supabase.table("chats").delete().eq("session_id", session_id).execute()
    
    return {
        "message": f"Session {session_id} deleted",
        "user_id": user.id
    }


@router.post("/sessions/{session_id}/clear")
async def clear_session(
    session_id: str,
    user = Depends(get_current_user)
):
    """Clear messages in a session but keep the session"""
    if not memory.get_session_metadata(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    memory.clear(session_id)
    return {
        "message": f"Session {session_id} cleared",
        "user_id": user.id
    }


@router.post("/retrieve")
async def retrieve_context(
    payload: QueryRequest,
    user = Depends(get_current_user)
):
    """Retrieve relevant context without chat"""
    user_id = user.id
    retriever = Retriever(user_id=user_id, top_k=5)
    results = retriever.retrieve(payload.question)

    return {
        "question": payload.question,
        "results": results,
        "user_id": user_id
    }