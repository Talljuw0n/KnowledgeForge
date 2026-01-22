import { deleteDocument } from "../api/backend";

export default function DocumentList({ documents, onDelete }) {
  if (documents.length === 0) {
    return <p>No documents uploaded yet.</p>;
  }

  return (
    <ul>
      {documents.map((doc) => (
        <li key={doc.id}>
          {doc.filename}
          <button onClick={() => onDelete(doc.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
