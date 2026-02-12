"""
Singleton embedding service - ensures only ONE model is loaded in memory
"""
from sentence_transformers import SentenceTransformer
from typing import List


class EmbeddingService:
    _instance = None
    _model = None
    
    def __new__(cls, model_name: str = "all-MiniLM-L6-v2"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.model_name = model_name
        return cls._instance

    @property
    def model(self):
        """Lazy load the model only when first accessed"""
        if EmbeddingService._model is None:
            print(f"🔄 Loading embedding model: {self.model_name}")
            EmbeddingService._model = SentenceTransformer(self.model_name)
            print(f"✅ Model loaded successfully")
        return EmbeddingService._model

    def embed_texts(self, texts: List[str]):
        return self.model.encode(texts, show_progress_bar=False)