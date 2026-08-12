from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from pathlib import Path
from typing import Dict

from app.services.document_loader import DocumentLoader
from app.services.indexer import Indexer
from app.services.database import save_document
from app.services.llm import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_MB = 100

# In-memory processing status: "{user_id}:{document_id}" -> "processing"|"ready"|"failed:<msg>"
_status: Dict[str, str] = {}


def _process_in_background(file_path: Path, user_id: str, document_id: int, status_key: str):
    try:
        document = DocumentLoader.load(file_path)

        if len(document["pages"]) == 0:
            _status[status_key] = "failed:No text could be extracted from this file."
            return

        indexer = Indexer(user_id=user_id)
        num_chunks = indexer.index_document(document, document_id)

        if num_chunks == 0:
            _status[status_key] = "failed:No text chunks could be created."
            return

        _status[status_key] = "ready"
        logger.info(f"Background processing done: {document_id} ({num_chunks} chunks)")

    except Exception as e:
        logger.error(f"Background processing failed for doc {document_id}: {e}", exc_info=True)
        _status[status_key] = f"failed:{str(e)}"
    finally:
        if file_path.exists():
            file_path.unlink()


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    user_id = user.id
    ext = Path(file.filename).suffix.lower()

    if ext not in DocumentLoader.SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File is {size_mb:.1f} MB — maximum is {MAX_FILE_MB} MB."
        )

    # Save file to disk
    user_upload_dir = UPLOAD_DIR / user_id
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_upload_dir / file.filename
    file_path.write_bytes(contents)

    # Create DB record immediately so the document appears in the library
    doc_record = save_document(user_id=user_id, filename=file.filename)
    document_id = doc_record["id"]

    # Track status and kick off background processing
    status_key = f"{user_id}:{document_id}"
    _status[status_key] = "processing"
    background_tasks.add_task(_process_in_background, file_path, user_id, document_id, status_key)

    logger.info(f"Upload accepted for user {user_id}, doc {document_id} ({size_mb:.1f} MB) — processing in background")

    return {
        "message": "Upload received. Processing in background.",
        "status": "processing",
        "document": {
            "id": document_id,
            "filename": file.filename,
            "size_mb": round(size_mb, 2),
        }
    }


@router.get("/documents/{document_id}/status")
async def get_document_status(document_id: int, user=Depends(get_current_user)):
    status_key = f"{user.id}:{document_id}"
    raw = _status.get(status_key)

    if raw is None:
        # Machine may have restarted — check the vector store directly
        from app.services.vector_store import FAISSVectorStore
        store_path = Path(f"data/vector_store/{user.id}")
        if store_path.exists():
            store = FAISSVectorStore(dim=384, store_path=store_path)
            store.load()
            if store.get_by_document_ids([document_id]):
                return {"status": "ready", "document_id": document_id}
        return {"status": "processing", "document_id": document_id}

    if raw.startswith("failed:"):
        return {"status": "failed", "error": raw[7:], "document_id": document_id}

    return {"status": raw, "document_id": document_id}


@router.get("/documents")
async def list_documents(user=Depends(get_current_user)):
    from app.services.database import get_user_documents
    documents = get_user_documents(user.id)
    return {"user_id": user.id, "documents": documents}


@router.delete("/documents/{filename}")
async def delete_document(filename: str, user=Depends(get_current_user)):
    from app.services.database import delete_document, get_user_documents
    from app.services.vector_store import FAISSVectorStore

    user_id = user.id
    docs = get_user_documents(user_id)
    doc = next((d for d in docs if d["filename"] == filename), None)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    document_id = doc["id"]

    store_path = Path(f"data/vector_store/{user_id}")
    if store_path.exists():
        vector_store = FAISSVectorStore(dim=384, store_path=store_path)
        vector_store.load()
        vector_store.delete_by_document_id(document_id)
        vector_store.save()

    delete_document(user_id=user_id, filename=filename)

    return {"message": f"Document {filename} deleted", "user_id": user_id}
