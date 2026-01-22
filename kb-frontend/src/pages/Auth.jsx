import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "../api/auth";

export default function Auth() {
  // State - stores data that can change
  const [email, setEmail] = useState(""); // User's email
  const [password, setPassword] = useState(""); // User's password
  const [displayName, setDisplayName] = useState(""); // User's display name
  const [isLogin, setIsLogin] = useState(true); // true = Login, false = Signup
  const [error, setError] = useState(null); // Error message
  const [loading, setLoading] = useState(false); // Is form submitting?
  const [message, setMessage] = useState(null); // Success message
  const navigate = useNavigate();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Don't reload page
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        // User is logging in
        await signIn(email, password);
        navigate("/chat"); // Go to chat page
      } else {
        // User is signing up
        await signUp(email, password, displayName);
        setMessage("Account created! You can now login.");
        setIsLogin(true); // Switch to login form
        setPassword(""); // Clear password
        setDisplayName(""); // Clear display name
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formBox}>
        {/* Logo/Title */}
        <div style={styles.header}>
          <div style={styles.logo}>📚</div>
          <h1 style={styles.title}>AI Knowledge Base</h1>
          <p style={styles.subtitle}>
            {isLogin ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        {/* Login/Signup Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Display Name Input - Only shown during signup */}
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Display Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          {/* Email Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {/* Password Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
            />
            {!isLogin && (
              <p style={styles.hint}>Must be at least 6 characters</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div style={styles.successBox}>
              ✓ {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              ...(loading ? styles.submitBtnDisabled : {})
            }}
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div style={styles.footer}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            style={styles.toggleBtn}
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

// All styles in one place
const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  
  formBox: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "450px",
  },
  
  // Header
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  logo: {
    fontSize: "50px",
    marginBottom: "15px",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "28px",
    color: "#333",
  },
  subtitle: {
    margin: 0,
    fontSize: "16px",
    color: "#666",
  },
  
  // Form
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    padding: "12px 16px",
    fontSize: "15px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    outline: "none",
  },
  hint: {
    margin: 0,
    fontSize: "12px",
    color: "#666",
  },
  
  // Messages
  errorBox: {
    padding: "12px",
    backgroundColor: "#ffebee",
    border: "1px solid #ef5350",
    borderRadius: "6px",
    color: "#c62828",
    fontSize: "14px",
  },
  successBox: {
    padding: "12px",
    backgroundColor: "#e8f5e9",
    border: "1px solid #66bb6a",
    borderRadius: "6px",
    color: "#2e7d32",
    fontSize: "14px",
  },
  
  // Buttons
  submitBtn: {
    padding: "14px",
    backgroundColor: "#0084ff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  submitBtnDisabled: {
    backgroundColor: "#cccccc",
    cursor: "not-allowed",
  },
  
  // Footer
  footer: {
    marginTop: "25px",
    textAlign: "center",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#0084ff",
    fontSize: "14px",
    cursor: "pointer",
    textDecoration: "underline",
  },
};