from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.services.retriever import Retriever
from app.services.llm import LLMService, save_chat
from app.services.memory import ChatMemory
from app.services.llm import rate_limit
import uuid

router = APIRouter()

# ✅ Keep in-memory cache for fast access
memory = ChatMemory(max_turns=20, max_tokens=4000)


@router.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()
    session_id = None
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            question = data.get("question")
            session_id = data.get("session_id") or session_id or str(uuid.uuid4())
            user_id = data.get("user_id")  # Client must send user_id
            
            if not user_id:
                await websocket.send_json({
                    "type": "error",
                    "message": "user_id is required"
                })
                continue

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
                await websocket.send_json({
                    "type": "error",
                    "message": "No relevant information found. Please upload documents first."
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
            
            for token in llm.stream_answer(
                question=question,
                context=context,
                user_id=user_id,
                session_id=session_id
            ):
                full_answer += token
                await websocket.send_json({
                    "type": "token",
                    "content": token
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
        print(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        print(f"Error in WebSocket: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass