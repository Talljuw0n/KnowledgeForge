from pathlib import Path
import numpy as np

from app.services.embeddings import EmbeddingService
from app.services.vector_store import FAISSVectorStore
from app.services.chunker import TextChunker


class Indexer:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.embedding_service = EmbeddingService()
        self.store_path = Path(f"data/vector_store/{user_id}")
    
    def index_document(self, document_data: dict, document_id: int) -> int:
        """Index a document into user-specific vectorstore with document_id"""
        # Chunk the document
        chunker = TextChunker()
        chunks = chunker.chunk_document(document_data)
        
        if len(chunks) == 0:
            return 0
        
        # Generate embeddings
        texts = [chunk["text"] for chunk in chunks]
        vectors = self.embedding_service.embed_texts(texts)
        
        # Load existing vectorstore or create new one
        self.store_path.mkdir(parents=True, exist_ok=True)
        vector_store = FAISSVectorStore(dim=384, store_path=self.store_path)
        vector_store.load()
        
        # Add document_id to each chunk's metadata
        metadatas = []
        for chunk in chunks:
            metadata = chunk["metadata"].copy()
            metadata["document_id"] = document_id  # ADD THIS LINE
            metadatas.append(metadata)
        
        # Add new vectors
        vector_store.add(vectors.astype("float32"), metadatas)
        
        # Save
        vector_store.save()
        
        return len(chunks)