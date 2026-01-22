from typing import List, Dict, Optional
from datetime import datetime
import json


class ChatMemory:
    def __init__(self, max_turns: int = 20, max_tokens: int = 4000):
        self.max_turns = max_turns
        self.max_tokens = max_tokens
        # Structure: {session_id: {"metadata": {...}, "history": [...]}}
        self.sessions: Dict[str, Dict] = {}
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough estimate: 1 token ≈ 4 characters"""
        return len(text) // 4
    
    def _trim_to_token_limit(self, history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Keep history within token limit"""
        total_tokens = 0
        trimmed_history = []
        
        for turn in reversed(history):
            turn_tokens = self._estimate_tokens(turn['question']) + self._estimate_tokens(turn['answer'])
            
            if total_tokens + turn_tokens > self.max_tokens:
                break
            
            trimmed_history.insert(0, turn)
            total_tokens += turn_tokens
        
        return trimmed_history
    
    def create_session(self, session_id: str, title: Optional[str] = None):
        """Create a new conversation session"""
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "metadata": {
                    "title": title or "New Conversation",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "message_count": 0
                },
                "history": []
            }
    
    def add_turn(self, session_id: str, question: str, answer: str):
        """Add a question-answer turn to a specific session"""
        if session_id not in self.sessions:
            self.create_session(session_id)
        
        self.sessions[session_id]["history"].append({
            "question": question,
            "answer": answer,
            "timestamp": datetime.now().isoformat()
        })
        
        # Update metadata
        self.sessions[session_id]["metadata"]["updated_at"] = datetime.now().isoformat()
        self.sessions[session_id]["metadata"]["message_count"] = len(self.sessions[session_id]["history"])
        
        # Auto-generate title from first question if still "New Conversation"
        if (self.sessions[session_id]["metadata"]["title"] == "New Conversation" and 
            len(self.sessions[session_id]["history"]) == 1):
            # Use first 50 chars of question as title
            self.sessions[session_id]["metadata"]["title"] = question[:50] + ("..." if len(question) > 50 else "")
        
        # Trim based on both turn count AND token count
        if len(self.sessions[session_id]["history"]) > self.max_turns:
            self.sessions[session_id]["history"] = self.sessions[session_id]["history"][-self.max_turns:]
        
        self.sessions[session_id]["history"] = self._trim_to_token_limit(self.sessions[session_id]["history"])
    
    def get_context(self, session_id: str) -> str:
        """Get formatted conversation history for a session"""
        if session_id not in self.sessions or not self.sessions[session_id]["history"]:
            return ""
        
        context_lines = []
        for turn in self.sessions[session_id]["history"]:
            context_lines.append(f"User: {turn['question']}")
            context_lines.append(f"Assistant: {turn['answer']}")
        
        return "\n".join(context_lines)
    
    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get raw history for a session"""
        if session_id not in self.sessions:
            return []
        return self.sessions[session_id]["history"]
    
    def get_session_metadata(self, session_id: str) -> Optional[Dict]:
        """Get metadata for a session"""
        if session_id not in self.sessions:
            return None
        return self.sessions[session_id]["metadata"]
    
    def list_sessions(self) -> List[Dict]:
        """List all conversation sessions with metadata"""
        sessions_list = []
        for session_id, data in self.sessions.items():
            sessions_list.append({
                "session_id": session_id,
                **data["metadata"]
            })
        
        # Sort by most recently updated
        sessions_list.sort(key=lambda x: x["updated_at"], reverse=True)
        return sessions_list
    
    def update_session_title(self, session_id: str, title: str):
        """Update the title of a session"""
        if session_id in self.sessions:
            self.sessions[session_id]["metadata"]["title"] = title
            self.sessions[session_id]["metadata"]["updated_at"] = datetime.now().isoformat()
    
    def delete_session(self, session_id: str):
        """Delete a conversation session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
    
    def clear(self, session_id: str):
        """Clear conversation history but keep session"""
        if session_id in self.sessions:
            self.sessions[session_id]["history"] = []
            self.sessions[session_id]["metadata"]["message_count"] = 0
            self.sessions[session_id]["metadata"]["updated_at"] = datetime.now().isoformat()