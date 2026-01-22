from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pathlib import Path
import shutil

from app.services.document_loader import DocumentLoader
from app.services.indexer import Indexer
from app.services.database import save_document
from app.services.llm import get_current_user

router = APIRouter()

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """Upload and process a document for the authenticated user"""
    user_id = user.id
    
    ext = Path(file.filename).suffix.lower()

    if ext not in DocumentLoader.SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Save to user-specific directory
    user_upload_dir = UPLOAD_DIR / user_id
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_upload_dir / file.filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Load document
        document = DocumentLoader.load(file_path)
        
        print(f"User: {user_id}")
        print(f"Document filename: {document['filename']}")
        print(f"Number of pages: {len(document['pages'])}")
        
        if len(document['pages']) == 0:
            raise HTTPException(status_code=400, detail="No text could be extracted from the document")
        
        # Save document metadata to database FIRST to get document_id
        doc_record = save_document(user_id=user_id, filename=file.filename)
        document_id = doc_record["id"]  # Get the document ID
        
        # Index document into user-specific vectorstore WITH document_id
        indexer = Indexer(user_id=user_id)
        num_chunks = indexer.index_document(document, document_id)  # Pass document_id
        
        print(f"Number of chunks created: {num_chunks}")
        
        if num_chunks == 0:
            raise HTTPException(status_code=400, detail="No text chunks could be created from the document")
        
        print(f"Document indexed successfully for user {user_id} with document_id {document_id}")
        
        # Clean up temp file
        file_path.unlink()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "message": "File uploaded and processed successfully",
        "user_id": user_id,
        "document": {
            "id": document_id,  # Include document_id in response
            "filename": document["filename"],
            "pages": len(document["pages"]),
            "chunks": num_chunks
        }
    }


@router.get("/documents")
async def list_documents(user = Depends(get_current_user)):
    """Get all documents for the authenticated user"""
    from app.services.database import get_user_documents
    
    user_id = user.id
    documents = get_user_documents(user_id)
    
    return {
        "user_id": user_id,
        "documents": documents
    }


@router.delete("/documents/{filename}")
async def delete_document(
    filename: str,
    user = Depends(get_current_user)
):
    """Delete a document for the authenticated user"""
    from app.services.database import delete_document
    from app.services.retriever import Retriever
    
    user_id = user.id
    
    # Delete from database
    delete_document(user_id=user_id, filename=filename)
    
    # Note: This deletes the metadata, but not specific vectors from FAISS
    # For complete deletion, you'd need to rebuild the vectorstore without this document
    # For now, we're just removing the metadata
    
    return {
        "message": f"Document {filename} deleted",
        "user_id": user_id
    }