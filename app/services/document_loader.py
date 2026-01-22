from pathlib import Path
import fitz  # PyMuPDF
from docx import Document
from PIL import Image
import pytesseract
import io


class DocumentLoader:
    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


    @staticmethod
    def load(file_path: Path) -> dict:
        ext = file_path.suffix.lower()

        if ext == ".pdf":
            return DocumentLoader._load_pdf(file_path)
        elif ext == ".docx":
            return DocumentLoader._load_docx(file_path)
        elif ext == ".txt":
            return DocumentLoader._load_txt(file_path)
        else:
            raise ValueError("Unsupported file type")

    @staticmethod
    def _load_pdf(file_path: Path) -> dict:
        doc = fitz.open(file_path)
        pages = []

        for i, page in enumerate(doc):
            # Try to extract text first
            text = page.get_text()
            
            # If no text found, try OCR
            if not text.strip():
                try:
                    # Convert page to image
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better quality
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    
                    # Perform OCR
                    text = pytesseract.image_to_string(img)
                except Exception as e:
                    print(f"OCR failed for page {i+1}: {e}")
                    text = ""
            
            pages.append({
                "page": i + 1,
                "text": text
            })

        return {
            "filename": file_path.name,
            "type": "pdf",
            "pages": pages
        }

    @staticmethod
    def _load_docx(file_path: Path) -> dict:
        """Load DOCX and split by page breaks or sections"""
        doc = Document(file_path)
        pages = []
        current_page = 1
        current_text = []
        
        for paragraph in doc.paragraphs:
            # Check if paragraph contains a page break
            if '\f' in paragraph.text or '\x0c' in paragraph.text:
                # Save current page
                if current_text:
                    pages.append({
                        "page": current_page,
                        "text": "\n".join(current_text)
                    })
                    current_page += 1
                    current_text = []
            else:
                # Add paragraph to current page
                if paragraph.text.strip():
                    current_text.append(paragraph.text)
        
        # Add the last page
        if current_text:
            pages.append({
                "page": current_page,
                "text": "\n".join(current_text)
            })
        
        # If no page breaks found, split by approximate page size
        if len(pages) == 1 and len(pages[0]["text"]) > 3000:
            pages = DocumentLoader._split_by_length(pages[0]["text"], file_path.name)
        
        # If still only one page, that's fine - it's a short document
        if not pages:
            # Fallback: treat entire document as one page
            all_text = "\n".join(p.text for p in doc.paragraphs)
            pages = [{"page": 1, "text": all_text}]

        return {
            "filename": file_path.name,
            "type": "docx",
            "pages": pages
        }
    
    @staticmethod
    def _split_by_length(text: str, filename: str, chars_per_page: int = 3000) -> list:
        """Split long text into approximate pages"""
        pages = []
        words = text.split()
        current_page = []
        current_length = 0
        page_num = 1
        
        for word in words:
            current_page.append(word)
            current_length += len(word) + 1  # +1 for space
            
            if current_length >= chars_per_page:
                pages.append({
                    "page": page_num,
                    "text": " ".join(current_page)
                })
                page_num += 1
                current_page = []
                current_length = 0
        
        # Add remaining text
        if current_page:
            pages.append({
                "page": page_num,
                "text": " ".join(current_page)
            })
        
        return pages

    @staticmethod
    def _load_txt(file_path: Path) -> dict:
        """Load TXT and optionally split into pages"""
        text = file_path.read_text(encoding="utf-8")
        
        # Split by form feed character (page break) if present
        if '\f' in text or '\x0c' in text:
            page_texts = text.split('\f')
            pages = [
                {"page": i + 1, "text": page_text.strip()}
                for i, page_text in enumerate(page_texts)
                if page_text.strip()
            ]
        elif len(text) > 3000:
            # Split long text files into approximate pages
            pages = DocumentLoader._split_by_length(text, file_path.name)
        else:
            # Short text file - single page
            pages = [{"page": 1, "text": text}]

        return {
            "filename": file_path.name,
            "type": "txt",
            "pages": pages
        }