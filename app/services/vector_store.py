import faiss
import pickle
import numpy as np
from pathlib import Path
from typing import List, Dict


class FAISSVectorStore:
    def __init__(self, dim: int, store_path: Path):
        self.dim = dim
        self.index = faiss.IndexFlatL2(dim)
        self.store_path = store_path
        self.metadata: List[Dict] = []

    def add(self, vectors, metadatas: List[Dict]):
        self.index.add(vectors)
        self.metadata.extend(metadatas)

    def search(self, query_vector, k: int = 5):
        if self.index.ntotal == 0:
            return []

        k = min(k, self.index.ntotal)
        distances, indices = self.index.search(query_vector, k)
        results = []

        for idx in indices[0]:
            if idx == -1 or idx >= len(self.metadata):
                continue
            results.append(self.metadata[idx])

        return results

    def delete_by_document_id(self, document_id: int):
        """Remove all vectors belonging to document_id and rebuild the index."""
        keep_indices = [
            i for i, m in enumerate(self.metadata)
            if m.get("document_id") != document_id
        ]

        if len(keep_indices) == self.index.ntotal:
            return  # nothing matched, nothing to do

        if not keep_indices:
            self.index = faiss.IndexFlatL2(self.dim)
            self.metadata = []
            return

        # Reconstruct index from kept vectors
        kept_vectors = np.vstack([
            self.index.reconstruct(i) for i in keep_indices
        ]).astype("float32")

        new_index = faiss.IndexFlatL2(self.dim)
        new_index.add(kept_vectors)
        self.index = new_index
        self.metadata = [self.metadata[i] for i in keep_indices]

    def get_by_document_ids(self, document_ids: List[int]) -> List[Dict]:
        """Return all chunks for the given document IDs, ordered by page."""
        id_set = set(document_ids)
        results = [m for m in self.metadata if m.get("document_id") in id_set]
        results.sort(key=lambda x: (x.get("document_id", 0), x.get("page", 0)))
        return results

    def save(self):
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