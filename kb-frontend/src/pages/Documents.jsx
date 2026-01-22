import { useState, useEffect } from "react";
import { supabase, signOut } from "../api/auth";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Documents() {
  // State - stores data that can change
  const [documents, setDocuments] = useState([]); // List of all documents
  const [uploading, setUploading] = useState(false); // Is file uploading?
  const [loading, setLoading] = useState(true); // Are we loading documents?
  const [error, setError] = useState(null); // Any error message
  const [selectedFile, setSelectedFile] = useState(null); // File user selected
  const [userName, setUserName] = useState(""); // User's name
  const navigate = useNavigate();

  // Get documents and user info when page loads
  useEffect(() => {
    fetchDocuments();
    getUserInfo();
  }, []);

  // Get user's name
  const getUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const name = user.user_metadata?.name || 
                   user.email?.split('@')[0] || 
                   "User";
      setUserName(name);
    }
  };

  // Get all documents from backend
  const fetchDocuments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_URL}/api/documents`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  // When user selects a file
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file type is allowed
      const validTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (!validTypes.includes(file.type)) {
        setError("Please upload a PDF, TXT, or Word document");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  // Upload file to backend
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await res.json();
      // Add new document to list
      setDocuments([...documents, data.document]);
      setSelectedFile(null);
      
      // Clear file input
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete a document
  const handleDelete = async (docId) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        // Remove document from list
        setDocuments(documents.filter((doc) => doc.id !== docId));
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Failed to delete document");
    }
  };

  // Sign out user
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Documents</h1>
          <p style={styles.subtitle}>Upload and manage your files</p>
        </div>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate("/chat")} style={styles.chatBtn}>
            Chat
          </button>
          <button onClick={handleSignOut} style={styles.signOutBtn}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Upload Section */}
        <div style={styles.uploadSection}>
          <h2 style={styles.sectionTitle}>Upload New Document</h2>
          
          <div style={styles.uploadBox}>
            <label style={styles.label}>
              Select File (PDF, TXT, or Word)
            </label>
            <input
              id="file-input"
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.txt,.doc,.docx"
              style={styles.fileInput}
            />

            {/* Show selected file info */}
            {selectedFile && (
              <div style={styles.selectedFile}>
                <div style={styles.fileInfo}>
                  <span style={styles.fileName}>📄 {selectedFile.name}</span>
                  <span style={styles.fileSize}>{formatFileSize(selectedFile.size)}</span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  style={styles.removeBtn}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Show error if any */}
            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                ...styles.uploadBtn,
                ...((!selectedFile || uploading) ? styles.uploadBtnDisabled : {})
              }}
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div style={styles.documentsSection}>
          <h2 style={styles.sectionTitle}>
            Your Documents ({documents.length})
          </h2>

          {loading ? (
            // Show loading spinner
            <div style={styles.centerBox}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            // Show when no documents
            <div style={styles.centerBox}>
              <div style={styles.emptyIcon}>📁</div>
              <p style={styles.emptyTitle}>No documents yet</p>
              <p style={styles.emptyText}>Upload your first document above</p>
            </div>
          ) : (
            // Show all documents
            <div style={styles.documentsList}>
              {documents.map((doc) => (
                <div key={doc.id} style={styles.documentItem}>
                  <div style={styles.documentInfo}>
                    <span style={styles.documentIcon}>📄</span>
                    <div>
                      <p style={styles.documentName}>{doc.filename}</p>
                      <p style={styles.documentMeta}>
                        {formatDate(doc.created_at)}
                        {doc.size && ` • ${formatFileSize(doc.size)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    style={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// All styles - easy to change colors/sizes
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  
  // Header
  header: {
    backgroundColor: "white",
    padding: "20px 30px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#333",
  },
  subtitle: {
    margin: "5px 0 0 0",
    fontSize: "14px",
    color: "#666",
  },
  headerButtons: {
    display: "flex",
    gap: "10px",
  },
  chatBtn: {
    padding: "10px 20px",
    backgroundColor: "#f0f0f0",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  signOutBtn: {
    padding: "10px 20px",
    backgroundColor: "#ff4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  
  // Main content
  mainContent: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "30px 20px",
  },
  
  // Upload section
  uploadSection: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    marginBottom: "30px",
    border: "1px solid #e0e0e0",
  },
  sectionTitle: {
    margin: "0 0 20px 0",
    fontSize: "20px",
    color: "#333",
  },
  uploadBox: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#555",
  },
  fileInput: {
    padding: "10px",
    border: "2px dashed #ccc",
    borderRadius: "6px",
    cursor: "pointer",
  },
  selectedFile: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    backgroundColor: "#e3f2fd",
    border: "1px solid #90caf9",
    borderRadius: "6px",
  },
  fileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  fileName: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#333",
  },
  fileSize: {
    fontSize: "13px",
    color: "#666",
  },
  removeBtn: {
    padding: "5px 10px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "20px",
    color: "#666",
  },
  errorBox: {
    padding: "12px",
    backgroundColor: "#ffebee",
    border: "1px solid #ef5350",
    borderRadius: "6px",
    color: "#c62828",
    fontSize: "14px",
  },
  uploadBtn: {
    padding: "12px",
    backgroundColor: "#0084ff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
  },
  uploadBtnDisabled: {
    backgroundColor: "#cccccc",
    cursor: "not-allowed",
  },
  
  // Documents section
  documentsSection: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    border: "1px solid #e0e0e0",
  },
  documentsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  documentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    backgroundColor: "#fafafa",
  },
  documentInfo: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flex: 1,
  },
  documentIcon: {
    fontSize: "30px",
  },
  documentName: {
    margin: "0 0 5px 0",
    fontSize: "15px",
    fontWeight: "500",
    color: "#333",
  },
  documentMeta: {
    margin: 0,
    fontSize: "13px",
    color: "#666",
  },
  deleteBtn: {
    padding: "8px 16px",
    backgroundColor: "#ffebee",
    color: "#c62828",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  
  // Loading/Empty states
  centerBox: {
    textAlign: "center",
    padding: "50px 20px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    margin: "0 auto 15px",
    border: "4px solid #f0f0f0",
    borderTop: "4px solid #0084ff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#666",
    fontSize: "14px",
  },
  emptyIcon: {
    fontSize: "60px",
    marginBottom: "15px",
  },
  emptyTitle: {
    margin: "0 0 5px 0",
    fontSize: "18px",
    color: "#333",
  },
  emptyText: {
    margin: 0,
    fontSize: "14px",
    color: "#666",
  },
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);