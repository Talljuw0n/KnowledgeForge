from app.services.supabase_client import supabase

def save_document(user_id: str, filename: str):
    """Save document metadata to Supabase and return document_id"""
    response = supabase.table("documents").insert({
        "user_id": user_id,
        "filename": filename,
        "status": "processing"
    }).execute()

    # Return the created document with its ID
    return response.data[0] if response.data else None

def update_document_status(document_id: str, status: str, error: str = None):
    """Persist a document's processing status so it survives backend restarts"""
    supabase.table("documents").update({
        "status": status,
        "error": error
    }).eq("id", document_id).execute()

def get_document(document_id: str, user_id: str):
    """Get a single document's metadata (including status/error) for its owner"""
    response = supabase.table("documents").select("*").eq("id", document_id).eq("user_id", user_id).execute()
    return response.data[0] if response.data else None

def get_user_documents(user_id: str):
    """Get all documents for a user"""
    response = supabase.table("documents").select("*").eq("user_id", user_id).execute()
    return response.data

def delete_document(user_id: str, filename: str):
    """Delete document metadata"""
    supabase.table("documents").delete().eq("user_id", user_id).eq("filename", filename).execute()