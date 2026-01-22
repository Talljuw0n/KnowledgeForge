from app.services.supabase_client import supabase

def save_document(user_id: str, filename: str):
    """Save document metadata to Supabase and return document_id"""
    response = supabase.table("documents").insert({
        "user_id": user_id,
        "filename": filename
    }).execute()
    
    # Return the created document with its ID
    return response.data[0] if response.data else None

def get_user_documents(user_id: str):
    """Get all documents for a user"""
    response = supabase.table("documents").select("*").eq("user_id", user_id).execute()
    return response.data

def delete_document(user_id: str, filename: str):
    """Delete document metadata"""
    supabase.table("documents").delete().eq("user_id", user_id).eq("filename", filename).execute()