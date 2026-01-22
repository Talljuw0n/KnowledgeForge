import faiss
import pickle
from pathlib import Path
from typing import List, Dict


class FAISSVectorStore:
    def __init__(self, dim: int, store_path: Path):
        self.index = faiss.IndexFlatL2(dim)
        self.store_path = store_path
        self.metadata: List[Dict] = []

    def add(self, vectors, metadatas: List[Dict]):
        self.index.add(vectors)
        self.metadata.extend(metadatas)

    def search(self, query_vector, k: int = 5):
        # Handle case where index is empty
        if self.index.ntotal == 0:
            return []
        
        # Adjust k if it's larger than available vectors
        k = min(k, self.index.ntotal)
        
        distances, indices = self.index.search(query_vector, k)
        results = []

        for idx in indices[0]:
            if idx == -1 or idx >= len(self.metadata):
                continue
            results.append(self.metadata[idx])

        return results

    def save(self):
        # Create directory if it doesn't exist
        self.store_path.mkdir(parents=True, exist_ok=True)
        
        faiss.write_index(self.index, str(self.store_path / "index.faiss"))
        with open(self.store_path / "metadata.pkl", "wb") as f:
            pickle.dump(self.metadata, f)

    def load(self):
        index_file = self.store_path / "index.faiss"
        meta_file = self.store_path / "metadata.pkl"

        if index_file.exists():
            self.index = faiss.read_index(str(index_file))

        if meta_file.exists():
            with open(meta_file, "rb") as f:
                self.metadata = pickle.load(f)