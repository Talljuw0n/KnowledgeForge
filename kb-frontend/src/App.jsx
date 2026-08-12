import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Library from "./pages/Library";
import Chat from "./pages/Chat";
import Document from "./pages/Document";
import Upload from "./pages/Upload";
import Study from "./pages/Study";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/document/:id" element={<ProtectedRoute><Document /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/study" element={<ProtectedRoute><Study /></ProtectedRoute>} />
        {/* Legacy redirect */}
        <Route path="/documents" element={<Navigate to="/library" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
