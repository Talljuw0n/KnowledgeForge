from typing import List, Dict


class TextChunker:
    def __init__(
        self,
        chunk_size: int = 500,
        overlap: int = 100
    ):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_document(self, document: Dict) -> List[Dict]:
        chunks = []

        for page in document["pages"]:
            page_text = page["text"]
            page_num = page["page"]

            start = 0
            chunk_index = 0

            while start < len(page_text):
                end = start + self.chunk_size
                chunk_text = page_text[start:end]

                if chunk_text.strip():
                    # Store everything at metadata level for consistency
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            "filename": document["filename"],
                            "page": page_num,
                            "chunk_index": chunk_index,
                            "text": chunk_text  # Keep this for backward compatibility
                        }
                    })

                chunk_index += 1
                start += self.chunk_size - self.overlap

        return chunks