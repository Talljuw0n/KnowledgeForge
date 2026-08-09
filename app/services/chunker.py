from typing import List, Dict


class TextChunker:
    def __init__(self, chunk_size: int = 500, overlap: int = 100):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def _split_words(self, text: str) -> List[str]:
        return text.split()

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into chunks that always end on a word boundary."""
        words = self._split_words(text)
        chunks = []
        start = 0  # word index

        while start < len(words):
            # Accumulate words until we reach chunk_size characters
            end = start
            length = 0
            while end < len(words) and length + len(words[end]) + (1 if end > start else 0) <= self.chunk_size:
                length += len(words[end]) + (1 if end > start else 0)
                end += 1

            # Always include at least one word to avoid infinite loop
            if end == start:
                end = start + 1

            chunk_text = " ".join(words[start:end])
            chunks.append(chunk_text)

            # Move start back by overlap characters (in word terms)
            overlap_len = 0
            overlap_start = end
            while overlap_start > start and overlap_len < self.overlap:
                overlap_start -= 1
                overlap_len += len(words[overlap_start]) + 1

            start = max(start + 1, overlap_start)

        return chunks

    def chunk_document(self, document: Dict) -> List[Dict]:
        chunks = []

        for page in document["pages"]:
            page_text = page["text"]
            page_num = page["page"]

            for chunk_index, chunk_text in enumerate(self._chunk_text(page_text)):
                if chunk_text.strip():
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            "filename": document["filename"],
                            "page": page_num,
                            "chunk_index": chunk_index,
                            "text": chunk_text
                        }
                    })

        return chunks