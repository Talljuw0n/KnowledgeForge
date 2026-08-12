from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from app.services.retriever import Retriever
from app.services.llm import LLMService, save_chat
from app.services.memory import ChatMemory
from app.services.llm import rate_limit
from app.services.supabase_client import supabase
import logging
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

memory = ChatMemory(max_turns=20, max_tokens=4000)


def _authenticate_ws(token: str):
    """Validate bearer token and return the user, or raise ValueError."""
    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if user is None:
            raise ValueError("Invalid token")
        return user
    except Exception as e:
        raise ValueError(f"Authentication failed: {e}")


@router.websocket("/ws/chat")
async def chat_ws(
    websocket: WebSocket,
    token: str = Query(..., description="Supabase bearer token"),
):
    # Authenticate before accepting the connection
    try:
        user = _authenticate_ws(token)
    except ValueError as e:
        await websocket.close(code=4001, reason=str(e))
        return

    await websocket.accept()
    user_id = user.id
    session_id = None
    logger.info(f"WebSocket connected for user {user_id}")

    try:
        while True:
            data = await websocket.receive_json()
            question = data.get("question")
            session_id = data.get("session_id") or session_id or str(uuid.uuid4())

            # 🛡️ Apply rate limit
            try:
                rate_limit(user_id)
            except HTTPException as e:
                await websocket.send_json({
                    "type": "error",
                    "message": e.detail
                })
                continue
            
            # Create session in memory if it doesn't exist
            if not memory.get_session_metadata(session_id):
                memory.create_session(session_id)
            
            # Send session_id back to client
            await websocket.send_json({
                "type": "session_id",
                "session_id": session_id
            })
            
            # Retrieve context with user scoping
            retriever = Retriever(user_id=user_id, top_k=5)
            results = retriever.retrieve(question)
            
            if not results:
                await websocket.send_json({"type": "mode", "mode": "general"})
                llm = LLMService()
                full_answer = ""
                for chunk in llm.stream_general_answer(
                    question=question,
                    user_id=user_id,
                    session_id=session_id
                ):
                    full_answer += chunk
                    await websocket.send_json({"type": "token", "content": chunk})
                memory.add_turn(session_id, question, full_answer)
                save_chat(
                    user_id=user_id,
                    question=question,
                    answer=full_answer,
                    sources=[],
                    session_id=session_id
                )
                await websocket.send_json({
                    "type": "done",
                    "session_id": session_id,
                    "conversation_turns": len(memory.get_history(session_id))
                })
                continue
            
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
                await websocket.send_json({
                    "type": "error",
                    "message": "No text content found in results"
                })
                continue
            
            context = "\n\n".join(context_blocks)
            
            # Send sources to client
            await websocket.send_json({
                "type": "sources",
                "sources": list(set(sources))
            })
            
            # Stream the answer
            llm = LLMService()
            full_answer = ""
            
            for chunk in llm.stream_answer(
                question=question,
                context=context,
                user_id=user_id,
                session_id=session_id
            ):
                full_answer += chunk
                await websocket.send_json({
                    "type": "token",
                    "content": chunk
                })
            
            # Save to BOTH after streaming completes:
            # 1. Memory (RAM) - fast
            memory.add_turn(session_id, question, full_answer)
            
            # 2. Database (Supabase) - persistent
            save_chat(
                user_id=user_id,
                question=question,
                answer=full_answer,
                sources=list(set(sources)),
                session_id=session_id
            )
            
            # Send completion message
            await websocket.send_json({
                "type": "done",
                "session_id": session_id,
                "conversation_turns": len(memory.get_history(session_id))
            })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}, session {session_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket for user {user_id}: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass