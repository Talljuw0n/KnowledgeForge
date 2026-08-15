"""
Singleton embedding service - ensures only ONE model is loaded in memory
"""
from typing import List
import logging

logger = logging.getLogger(__name__)


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
        if EmbeddingService._model is None:
            # Lazy import — sentence_transformers pulls in PyTorch (~60 s to import).
            # Deferring to first use cuts server startup from ~76 s to ~5 s.
            from sentence_transformers import SentenceTransformer
            logger.info("Loading embedding model %s", self.model_name)
            EmbeddingService._model = SentenceTransformer(self.model_name)
            logger.info("Embedding model ready")
        return EmbeddingService._model

    def embed_texts(self, texts: List[str]):
        return self.model.encode(texts, show_progress_bar=False, batch_size=64)