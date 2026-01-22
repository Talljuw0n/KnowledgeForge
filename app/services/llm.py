import os
from groq import Groq
from typing import Generator, Optional, List, Dict
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import json
from collections import defaultdict
import time
import asyncio
import logging

# Load environment variables first
load_dotenv()

# ============= STRUCTURED LOGGING =============

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger(__name__)

# ============= STARTUP VALIDATION =============

def validate_startup():
    """Validate all required environment variables are present"""
    required_envs = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "GROQ_API_KEY"
    ]

    for env in required_envs:
        if not os.getenv(env):
            raise RuntimeError(f"Missing required env var: {env}")

    logger.info("✅ Startup validation passed")

# Run validation immediately
validate_startup()

security = HTTPBearer()

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# ============= RATE LIMITING =============

RATE_LIMIT_REQUESTS = 20   # max requests
RATE_LIMIT_WINDOW = 60     # seconds

user_requests = defaultdict(list)


def rate_limit(user_id: str):
    """Check if user has exceeded rate limit"""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW

    # Remove expired timestamps
    user_requests[user_id] = [
        t for t in user_requests[user_id]
        if t > window_start
    ]

    if len(user_requests[user_id]) >= RATE_LIMIT_REQUESTS:
        logger.warning(f"Rate limit exceeded for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later."
        )

    user_requests[user_id].append(now)
    logger.info(f"Rate limit check passed for user {user_id} ({len(user_requests[user_id])}/{RATE_LIMIT_REQUESTS})")


# ============= TIMEOUT PROTECTION =============

async def run_with_timeout(coro, timeout=30):
    """Wrap async operation with timeout"""
    try:
        return await asyncio.wait_for(coro, timeout)
    except asyncio.TimeoutError:
        logger.error("LLM request timed out", exc_info=True)
        raise HTTPException(
            status_code=504,
            detail="LLM request timed out"
        )


# ============= INPUT VALIDATION =============

def validate_query(query: str):
    """Validate user query before processing"""
    if not query or len(query.strip()) < 3:
        logger.warning(f"Query too short: '{query}'")
        raise HTTPException(
            status_code=400,
            detail="Query too short. Please provide at least 3 characters."
        )
    
    if len(query) > 1000:
        logger.warning(f"Query too long: {len(query)} characters")
        raise HTTPException(
            status_code=400,
            detail="Query too long. Maximum 1000 characters."
        )
    
    logger.info(f"Query validation passed: {len(query)} characters")


# ============= CHAT HISTORY FUNCTIONS =============

def save_chat(
    user_id: str,
    question: str,
    answer: str,
    sources: list,
    session_id: Optional[str] = None
):
    """Save chat interaction to Supabase"""
    try:
        supabase.table("chats").insert({
            "user_id": user_id,
            "question": question,
            "answer": answer,
            "sources": json.dumps(sources),
            "session_id": session_id
        }).execute()
        logger.info(f"Chat saved for user {user_id}, session {session_id}")
    except Exception as e:
        logger.error(f"Failed to save chat: {str(e)}", exc_info=True)
        # Don't raise - saving chat shouldn't block the response


def load_chat_history(user_id: str, session_id: Optional[str] = None, limit: int = 5) -> List[Dict]:
    """Load recent chat history for context"""
    try:
        query = (
            supabase
            .table("chats")
            .select("question, answer")
            .eq("user_id", user_id)
        )
        
        if session_id:
            query = query.eq("session_id", session_id)
        
        response = (
            query
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        history = []
        for row in reversed(response.data):
            history.append({"role": "user", "content": row["question"]})
            history.append({"role": "assistant", "content": row["answer"]})

        logger.info(f"Loaded {len(history)//2} chat turns for user {user_id}")
        return history
    except Exception as e:
        logger.error(f"Failed to load chat history: {str(e)}", exc_info=True)
        return []  # Return empty history if load fails


# ============= LLM SERVICE =============

class LLMService:
    """
    LLM service using Groq's Llama 3.3 70B model.
    Supports both regular and streaming responses with chat history.
    """
    
    def __init__(self, temperature: float = 0.2):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"
        self.temperature = temperature
        self.system_prompt = """You are a knowledge base assistant.
Answer questions ONLY using the provided document context.
If the answer is not in the context, say "I don't know based on the provided documents."
Be conversational and reference previous messages when relevant."""
        
        logger.info(f"LLMService initialized with model {self.model}")
    
    def _build_messages(
        self, 
        question: str, 
        context: str, 
        chat_history: List[Dict] = None
    ) -> List[Dict]:
        """Build messages array with system prompt, history, and current question"""
        messages = [
            {"role": "system", "content": self.system_prompt}
        ]
        
        if chat_history:
            messages.extend(chat_history)
            logger.debug(f"Added {len(chat_history)} history messages")
        
        user_message = f"""Document Context:
{context}

Question: {question}"""
        
        messages.append({"role": "user", "content": user_message})
        
        return messages

    def generate_answer(
        self, 
        question: str, 
        context: str,
        user_id: str,
        session_id: Optional[str] = None,
        temperature: Optional[float] = None
    ) -> str:
        """
        Generate a complete answer (non-streaming) with chat history.
        """
        temp = temperature if temperature is not None else self.temperature
        
        try:
            logger.info(f"Generating answer for user {user_id}")
            
            chat_history = load_chat_history(user_id, session_id, limit=5)
            messages = self._build_messages(question, context, chat_history)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temp,
                timeout=30
            )
            
            answer = response.choices[0].message.content.strip()
            logger.info(f"Answer generated successfully for user {user_id}")
            return answer
            
        except Exception as e:
            logger.error(f"Failed to generate answer: {str(e)}", exc_info=True)
            raise Exception(f"Failed to generate answer: {str(e)}")

    def stream_answer(
        self, 
        question: str, 
        context: str,
        user_id: str,
        session_id: Optional[str] = None,
        temperature: Optional[float] = None
    ) -> Generator[str, None, None]:
        """
        Generate answer with streaming (yields chunks in real-time) with chat history.
        """
        temp = temperature if temperature is not None else self.temperature
        
        try:
            logger.info(f"Streaming answer for user {user_id}")
            
            chat_history = load_chat_history(user_id, session_id, limit=5)
            messages = self._build_messages(question, context, chat_history)
            
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temp,
                stream=True,
                timeout=30
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
            logger.info(f"Streaming completed for user {user_id}")
            
        except Exception as e:
            logger.error(f"Streaming failed: {str(e)}", exc_info=True)
            yield f"Error generating response: {str(e)}"


# ============= AUTHENTICATION =============

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Validate authentication token and return current user."""
    token = credentials.credentials

    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if user is None:
            logger.warning("Invalid authentication token provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        logger.info(f"User authenticated: {user.id}")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )