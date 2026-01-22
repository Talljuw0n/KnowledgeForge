from typing import List, Dict, Optional
import numpy as np
from pathlib import Path

from app.services.embeddings import EmbeddingService
from app.services.vector_store import FAISSVectorStore


class Retriever:
    def __init__(self, user_id: str, top_k: int = 5):
        self.user_id = user_id
        self.embedding_service = EmbeddingService()
        self.top_k = top_k
        self.store_path = Path(f"data/vector_store/{user_id}")
        # DON'T load on init - load when needed
        self._vector_store = None
    
    @property
    def vector_store(self):
        """Lazy load vector store only when needed"""
        if self._vector_store is None:
            self._vector_store = FAISSVectorStore(
                dim=384,  # MiniLM embedding dimension
                store_path=self.store_path
            )
            self._vector_store.load()
        return self._vector_store

    def retrieve(self, query: str, document_ids: Optional[List[int]] = None) -> List[Dict]:
        """Retrieve relevant documents for this user, optionally filtered by document_ids"""
        # Check if vector store is empty
        if self.vector_store.index.ntotal == 0:
            return []
        
        query_vector = self.embedding_service.embed_texts([query])
        query_vector = query_vector.astype("float32")

        # Get more results initially to filter later
        search_k = self.top_k * 3 if document_ids else self.top_k
        results = self.vector_store.search(query_vector, k=search_k)
        
        # Filter by document_ids if provided
        if document_ids:
            filtered_results = []
            for result in results:
                # Check if this result belongs to one of the selected documents
                doc_id = result.get("document_id") or result.get("doc_id")
                if doc_id in document_ids:
                    filtered_results.append(result)
                    # Stop when we have enough results
                    if len(filtered_results) >= self.top_k:
                        break
            return filtered_results
        
        return results
    
    def delete_user_data(self):
        """Delete all vectorstore data for this user"""
        import shutil
        if self.store_path.exists():
            shutil.rmtree(self.store_path)