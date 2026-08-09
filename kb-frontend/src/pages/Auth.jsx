import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, AlertTriangle } from "lucide-react";
import { supabase, signIn, signUp, resetPassword, updatePassword } from "../api/auth";

// ─── Disposable email domains ─────────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","mailinator2.com","notmailinator.com",
  "guerrillamail.com","guerrillamail.net","guerrillamail.org",
  "guerrillamail.biz","guerrillamail.de","guerrillamail.info","guerrillamailblock.com",
  "sharklasers.com","grr.la","spam4.me",
  "tempmail.com","temp-mail.org","tempr.email",
  "10minutemail.com","10minutemail.net","10minutemail.co.uk",
  "yopmail.com","yopmail.fr",
  "trashmail.at","trashmail.io","trashmail.me","trashmail.xyz",
  "trashmail.com","trashmail.net","trashmail.org",
  "trashdevil.com","trashdevil.de",
  "dispostable.com","discard.email",
  "maildrop.cc","mailnull.com","mailcatch.com","mailexpire.com",
  "fakeinbox.com","filzmail.com","throwam.com",
  "spamgourmet.com","spamgourmet.net","spamgourmet.org",
  "wegwerfmail.de","wegwerfmail.net","wegwerfmail.org",
  "spamthisplease.com","inboxbear.com","mailmetrash.com",
  "throwam.net","mailmetrash.com","mailin8r.com",
  "throwam.com","tempr.email","discard.email",
]);

// ─── Common password blocklist ────────────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  "password","password1","password12","password123","passw0rd","p@ssword","p@ssw0rd",
  "123456","1234567","12345678","123456789","1234567890",
  "qwerty","qwerty123","qwerty1","qwertyuiop",
  "abc123","abcdef","abcd1234",
  "letmein","letmein1","welcome","welcome1",
  "admin","admin123","admin1234",
  "iloveyou","iloveyou1","monkey","monkey1",
  "dragon","dragon1","master","master1",
  "sunshine","sunshine1","princess","princess1",
  "football","football1","superman1","batman1",
  "liverpool","trustno1","shadow","shadow1",
  "baseball","baseball1","soccer","soccer1",
]);

// ─── Validation helpers ───────────────────────────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function sanitizeName(raw) {
  return raw.replace(/<[^>]*>/g, "").replace(/[<>&"'`\\]/g, "").trim();
}

function validateEmail(v) {
  if (!v.trim()) return "Email is required.";
  if (v.length > 254) return "Email address is too long.";
  if (!EMAIL_RE.test(v.trim())) return "Enter a valid email address (e.g. you@example.com).";
  const domain = v.trim().split("@")[1]?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.has(domain))
    return "Disposable email addresses aren't allowed. Please use your real email.";
  return null;
}

function validatePassword(v, isLogin = false) {
  if (!v) return "Password is required.";
  if (v.length > 128) return "Password must be 128 characters or fewer.";
  if (isLogin) return null;
  if (v.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(v)) return "Password must include at least one letter.";
  if (!/[0-9]/.test(v)) return "Password must include at least one number.";
  if (COMMON_PASSWORDS.has(v.toLowerCase()))
    return "This password is too common. Choose something more unique.";
  return null;
}

function validateDisplayName(v) {
  if (!v.trim()) return "Name is required.";
  if (/[<>&"'`\\]/.test(v)) return "Name contains characters that aren't allowed.";
  const clean = sanitizeName(v);
  if (clean.length < 2) return "Name must be at least 2 characters.";
  if (clean.length > 60) return "Name must be 60 characters or fewer.";
  return null;
}

function friendlyError(msg = "") {
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials"))
    return "Incorrect email or password.";
  if (msg.includes("Email not confirmed"))
    return "Please confirm your email address before signing in. Check your inbox.";
  if (msg.includes("User already registered") || msg.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (msg.includes("Password should be") || msg.includes("weak_password"))
    return "Choose a stronger password — try mixing letters, numbers, and symbols.";
  if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("429"))
    return "Too many requests. Please wait a moment and try again.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network error. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 60;

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function BrandMark({ size = 30 }) {
  return (
    <div style={{
      width: size, height: size, background: "#12876a",
      borderRadius: "9px", display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
    }}>
      <svg width={Math.round(size * 0.57)} height={Math.round(size * 0.57)} viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <span style={s.fieldError} role="alert">{message}</span>;
}

function ErrorBox({ message }) {
  return (
    <div style={s.errorBox} role="alert">
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
      <span>{message}</span>
    </div>
  );
}

function SuccessBox({ message }) {
  return (
    <div style={s.successBox} role="status">
      <Check size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
      <span>{message}</span>
    </div>
  );
}

function StrengthBar({ password }) {
  const score = getStrength(password);
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#a3342a", "#c97a1a", "#12876a", "#0b5c47"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "999px",
            backgroundColor: i < score ? colors[score - 1] : "#eef1ef",
            transition: "background-color 0.2s",
          }} />
        ))}
      </div>
      {score > 0 && (
        <span style={{ fontSize: "12px", color: colors[score - 1] }}>
          {labels[score - 1]}
        </span>
      )}
    </div>
  );
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(score, pw.length >= 6 ? 1 : 0);
}

// ─── Reset password form ──────────────────────────────────────────────────────
function ResetPasswordForm({ onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ newPassword: null, confirmPassword: null });

  const touchField = (field, value) => {
    let err = null;
    if (field === "newPassword") err = validatePassword(value);
    if (field === "confirmPassword" && value && value !== newPassword)
      err = "Passwords don't match.";
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const pwErr = validatePassword(newPassword);
    const confirmErr = newPassword !== confirmPassword ? "Passwords don't match." : null;
    setFieldErrors({ newPassword: pwErr, confirmPassword: confirmErr });
    if (pwErr || confirmErr) return;

    setLoading(true);
    try {
      await updatePassword(newPassword);
      onSuccess();
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.resetCard}>
        <div style={{ ...s.brand, marginBottom: "32px" }}>
          <BrandMark size={30} />
          <span style={s.brandName}>KnowledgeForge</span>
        </div>

        <h1 style={s.heading}>Choose a new password</h1>
        <p style={s.subheading}>At least 8 characters, one letter, one number.</p>

        <form onSubmit={handleSubmit} style={{ ...s.form, marginTop: "28px" }} noValidate>
          <div style={s.field}>
            <label style={s.label} htmlFor="reset-pw">New password</label>
            <input
              id="reset-pw"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setFieldErrors(p => ({ ...p, newPassword: null })); }}
              onBlur={e => touchField("newPassword", e.target.value)}
              required
              maxLength={128}
              autoComplete="new-password"
              autoFocus
              style={{ ...s.input, ...(fieldErrors.newPassword ? s.inputError : {}) }}
            />
            <FieldError message={fieldErrors.newPassword} />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="reset-confirm">Confirm password</label>
            <input
              id="reset-confirm"
              type="password"
              placeholder="Same password again"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: null })); }}
              onBlur={e => touchField("confirmPassword", e.target.value)}
              required
              maxLength={128}
              autoComplete="new-password"
              style={{ ...s.input, ...(fieldErrors.confirmPassword ? s.inputError : {}) }}
            />
            <FieldError message={fieldErrors.confirmPassword} />
          </div>

          {newPassword.length > 0 && <StrengthBar password={newPassword} />}
          {error && <ErrorBox message={error} />}

          <button
            type="submit"
            disabled={loading}
            style={{ ...s.submitBtn, ...(loading ? s.submitDisabled : {}) }}
          >
            {loading ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Reset success screen ─────────────────────────────────────────────────────
function ResetSuccessScreen({ onContinue }) {
  return (
    <div style={s.page}>
      <div style={s.resetCard}>
        <div style={{
          width: "52px", height: "52px", backgroundColor: "#dff2ec",
          borderRadius: "16px", display: "flex", alignItems: "center",
          justifyContent: "center", marginBottom: "24px",
        }}>
          <Check size={26} color="#12876a" strokeWidth={2.5} />
        </div>
        <h1 style={s.heading}>Password updated</h1>
        <p style={{ ...s.subheading, marginBottom: "28px" }}>
          You're signed in. You can start using KnowledgeForge right away.
        </p>
        <button onClick={onContinue} style={s.submitBtn}>
          Go to my dashboard
        </button>
      </div>
    </div>
  );
}

// ─── Main Auth page ───────────────────────────────────────────────────────────
export default function Auth() {
  const [mode, setMode] = useState("auth");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showUniversityMsg, setShowUniversityMsg] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({ name: null, email: null, password: null });
  const navigate = useNavigate();

  // Lockout countdown
  useEffect(() => {
    if (lockoutSecs <= 0) return;
    const t = setInterval(() => {
      setLockoutSecs(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutSecs]);

  // Supabase PASSWORD_RECOVERY event (arrives when user clicks reset email link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("recovering");
    });
    return () => subscription.unsubscribe();
  }, []);

  const touchField = (field, value) => {
    let err = null;
    if (field === "email") err = validateEmail(value);
    if (field === "password") err = validatePassword(value, isLogin);
    if (field === "name") err = validateDisplayName(value);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const clearFieldError = (field) =>
    setFieldErrors(prev => ({ ...prev, [field]: null }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Honeypot — silently drop bot submissions
    if (honeypot) return;

    if (lockoutSecs > 0) {
      setError(`Too many failed attempts. Please wait ${lockoutSecs} seconds.`);
      return;
    }

    // Validate all fields; surface inline errors before any network call
    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password, isLogin);
    const nameErr = !isLogin ? validateDisplayName(displayName) : null;
    setFieldErrors({ email: emailErr, password: pwErr, name: nameErr });
    if (emailErr || pwErr || nameErr) return;

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        navigate("/home");
      } else {
        const cleanName = sanitizeName(displayName);
        await signUp(email.trim(), password, cleanName);
        setSuccess("Account created. Check your inbox to confirm your email, then sign in.");
        setIsLogin(true);
        setPassword("");
        setDisplayName("");
        setFailedAttempts(0);
        setFieldErrors({ name: null, email: null, password: null });
      }
    } catch (err) {
      if (isLogin) {
        setFailedAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) { setLockoutSecs(LOCKOUT_SECS); return 0; }
          return next;
        });
      }
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);
    const emailErr = validateEmail(email);
    if (emailErr) { setFieldErrors(p => ({ ...p, email: emailErr })); return; }

    setResetLoading(true);
    try { await resetPassword(email.trim()); } catch {}
    // Same message whether email exists or not — prevents enumeration
    setSuccess("If an account exists for that email, a reset link has been sent. Check your inbox.");
    setResetLoading(false);
  };

  const switchMode = (login) => {
    if (login === isLogin) return;
    setIsLogin(login);
    setError(null);
    setSuccess(null);
    setShowUniversityMsg(false);
    setFieldErrors({ name: null, email: null, password: null });
  };

  const isLocked = lockoutSecs > 0;
  const attemptsLeft = MAX_ATTEMPTS - failedAttempts;

  if (mode === "recovering") return <ResetPasswordForm onSuccess={() => setMode("reset_done")} />;
  if (mode === "reset_done") return <ResetSuccessScreen onContinue={() => navigate("/home")} />;

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* ─── Left column ─── */}
        <div style={s.left}>
          <div style={s.brand}>
            <BrandMark size={30} />
            <span style={s.brandName}>KnowledgeForge</span>
          </div>

          <div style={s.segTrack}>
            <button type="button" onClick={() => switchMode(true)}
              style={{ ...s.segBtn, ...(isLogin ? s.segActive : {}) }}>
              Sign in
            </button>
            <button type="button" onClick={() => switchMode(false)}
              style={{ ...s.segBtn, ...(!isLogin ? s.segActive : {}) }}>
              Create account
            </button>
          </div>

          <h1 style={s.heading}>
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p style={s.subheading}>
            {isLogin
              ? "Sign in to pick up where you left off."
              : "Free while you're a student. No card needed."}
          </p>

          {isLocked && (
            <div style={s.lockoutBox} role="alert">
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>
                Temporarily locked after {MAX_ATTEMPTS} failed attempts.
                Try again in <strong>{lockoutSecs}s</strong>.
              </span>
            </div>
          )}

          {!isLocked && failedAttempts >= 2 && isLogin && (
            <div style={s.warnBox} role="alert">
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>
                {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left before a temporary lockout.
              </span>
            </div>
          )}

          {/* Honeypot — off-screen, invisible to real users, bots fill it */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            style={s.honeypot}
          />

          <form onSubmit={handleSubmit} style={s.form} noValidate>
            {!isLogin && (
              <div style={s.field}>
                <label style={s.label} htmlFor="auth-name">Your name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Jamie Silva"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); clearFieldError("name"); }}
                  onBlur={e => touchField("name", e.target.value)}
                  required
                  maxLength={60}
                  autoComplete="name"
                  style={{ ...s.input, ...(fieldErrors.name ? s.inputError : {}) }}
                  disabled={isLocked || loading}
                />
                <FieldError message={fieldErrors.name} />
              </div>
            )}

            <div style={s.field}>
              <label style={s.label} htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="jamie@university.ac.uk"
                value={email}
                onChange={e => { setEmail(e.target.value); clearFieldError("email"); }}
                onBlur={e => touchField("email", e.target.value)}
                required
                maxLength={254}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                style={{ ...s.input, ...(fieldErrors.email ? s.inputError : {}) }}
                disabled={isLocked || loading}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div style={s.field}>
              <div style={s.labelRow}>
                <label style={s.label} htmlFor="auth-password">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading || isLocked}
                    style={{ ...s.forgotBtn, ...(resetLoading || isLocked ? { opacity: 0.4 } : {}) }}
                  >
                    {resetLoading ? "Sending…" : "Forgot?"}
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                placeholder={isLogin ? "Your password" : "At least 8 characters"}
                value={password}
                onChange={e => { setPassword(e.target.value); clearFieldError("password"); }}
                onBlur={e => touchField("password", e.target.value)}
                required
                maxLength={128}
                autoComplete={isLogin ? "current-password" : "new-password"}
                style={{ ...s.input, ...(fieldErrors.password ? s.inputError : {}) }}
                disabled={isLocked || loading}
              />
              <FieldError message={fieldErrors.password} />
              {!isLogin && password.length > 0 && <StrengthBar password={password} />}
            </div>

            {error && <ErrorBox message={error} />}
            {success && <SuccessBox message={success} />}

            <button
              type="submit"
              disabled={loading || isLocked}
              style={{ ...s.submitBtn, ...((loading || isLocked) ? s.submitDisabled : {}) }}
            >
              {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <div style={s.dividerLine} />
          </div>

          <button
            type="button"
            onClick={() => setShowUniversityMsg(v => !v)}
            style={s.secondaryBtn}
          >
            Continue with your university account
          </button>

          {showUniversityMsg && (
            <div style={s.universityMsg}>
              <strong>Coming soon.</strong> University single sign-on is on the roadmap.
              In the meantime, create a free account with your university email above.
            </div>
          )}
        </div>

        {/* ─── Right column ─── */}
        <div style={s.right}>
          <h2 style={s.rightHeading}>
            Ask your notes anything. Get answers with the page number.
          </h2>
          <p style={s.rightBody}>
            Upload your lectures, readings and notes. Nothing comes from the open internet, so nothing gets made up.
          </p>

          <div style={s.sampleCard}>
            <p style={s.sampleLabel}>YOU ASKED</p>
            <p style={s.sampleQuestion}>
              What's the ATP yield from one glucose molecule in aerobic respiration?
            </p>
            <p style={s.sampleAnswer}>
              Aerobic respiration yields approximately 30–32 ATP per glucose molecule, with glycolysis contributing 2 ATP and the Krebs cycle feeding the electron transport chain for the remainder.
            </p>
            <div style={s.sampleDivider} />
            <div>
              <span style={s.sourcePill}>Lecture 6 · slide 14</span>
            </div>
          </div>

          <div style={s.chips}>
            {["Answers cite the page", "PDF, DOCX and TXT", "Private to your account"].map(text => (
              <div key={text} style={s.chip}>
                <Check size={13} color="#12876a" strokeWidth={3} />
                <span style={s.chipText}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f7f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
  },
  card: {
    width: "100%",
    maxWidth: "940px",
    display: "grid",
    gridTemplateColumns: "minmax(340px,1fr) minmax(0,1fr)",
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 14px 40px rgba(22,32,28,0.07)",
  },
  resetCard: {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "20px",
    padding: "44px 44px 40px",
    boxShadow: "0 14px 40px rgba(22,32,28,0.07)",
  },
  left: {
    padding: "44px 44px 40px",
    display: "flex",
    flexDirection: "column",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "32px",
  },
  brandName: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#16201c",
    letterSpacing: "-0.01em",
  },
  segTrack: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    backgroundColor: "#eef1ef",
    padding: "4px",
    borderRadius: "12px",
    gap: "2px",
    marginBottom: "28px",
  },
  segBtn: {
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#5f6b66",
    background: "transparent",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  segActive: {
    backgroundColor: "#ffffff",
    color: "#16201c",
    boxShadow: "0 1px 3px rgba(22,32,28,0.12)",
  },
  heading: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#16201c",
    letterSpacing: "-0.022em",
    marginBottom: "6px",
  },
  subheading: {
    fontSize: "14px",
    color: "#5f6b66",
    marginBottom: "28px",
  },
  honeypot: {
    position: "absolute",
    left: "-9999px",
    width: "1px",
    height: "1px",
    opacity: 0,
    pointerEvents: "none",
    tabIndex: -1,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#3d4a45",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    fontSize: "13px",
    fontWeight: "500",
    color: "#0f7a5f",
    cursor: "pointer",
    padding: 0,
    transition: "opacity 0.15s",
  },
  input: {
    padding: "12px 14px",
    fontSize: "15px",
    border: "1px solid #d9dfdb",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
    color: "#16201c",
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s",
  },
  inputError: {
    borderColor: "#d9544a",
    backgroundColor: "#fffaf9",
  },
  fieldError: {
    fontSize: "12px",
    color: "#a3342a",
    lineHeight: "1.4",
  },
  errorBox: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    padding: "11px 14px",
    backgroundColor: "#fdf2f1",
    border: "1px solid #f0c4bf",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#a3342a",
    lineHeight: "1.5",
  },
  successBox: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    padding: "11px 14px",
    backgroundColor: "#f0f5f2",
    border: "1px solid #dbe8e2",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#0b5c47",
    lineHeight: "1.5",
  },
  lockoutBox: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    padding: "11px 14px",
    backgroundColor: "#fdf6ed",
    border: "1px solid #f5d9a8",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#7a4a10",
    lineHeight: "1.5",
    marginBottom: "16px",
  },
  warnBox: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    padding: "10px 14px",
    backgroundColor: "#fdf6ed",
    border: "1px solid #f5d9a8",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#7a4a10",
    lineHeight: "1.5",
    marginBottom: "12px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px 18px",
    backgroundColor: "#12876a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "4px",
    transition: "background-color 0.15s",
  },
  submitDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "22px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "#e3e7e4",
  },
  dividerText: {
    fontSize: "12px",
    color: "#9aa5a0",
    flexShrink: 0,
  },
  secondaryBtn: {
    width: "100%",
    padding: "13px 18px",
    backgroundColor: "#ffffff",
    color: "#16201c",
    border: "1px solid #d9dfdb",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  universityMsg: {
    marginTop: "12px",
    padding: "11px 14px",
    backgroundColor: "#f5f7f6",
    border: "1px solid #e3e7e4",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#3d4a45",
    lineHeight: "1.55",
  },
  right: {
    backgroundColor: "#f0f5f2",
    borderLeft: "1px solid #e3e7e4",
    padding: "44px 40px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "20px",
  },
  rightHeading: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#16201c",
    letterSpacing: "-0.018em",
    lineHeight: "1.25",
  },
  rightBody: {
    fontSize: "14px",
    color: "#5f6b66",
    lineHeight: "1.6",
  },
  sampleCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "14px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sampleLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#9aa5a0",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  sampleQuestion: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#16201c",
  },
  sampleAnswer: {
    fontSize: "14px",
    color: "#3d4a45",
    lineHeight: "1.55",
  },
  sampleDivider: {
    height: "1px",
    backgroundColor: "#eef1ef",
    margin: "4px 0",
  },
  sourcePill: {
    display: "inline-block",
    backgroundColor: "#dff2ec",
    color: "#0b5c47",
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 9px",
    borderRadius: "999px",
  },
  chips: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #e3e7e4",
    borderRadius: "999px",
    padding: "7px 13px",
    width: "fit-content",
  },
  chipText: {
    fontSize: "13px",
    color: "#3d4a45",
  },
};
