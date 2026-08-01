import { useState } from "react";
import { supabase } from "./database";

function buildAuthCSS(t) {
  return `
    .auth-shell { min-height: 100vh; display: flex; background: ${t.bg}; transition: background 0.3s; }
    .auth-panel { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: linear-gradient(160deg, #150a24 0%, #1f1035 55%, #2a1145 100%); }
    .auth-panel-inner { position: relative; z-index: 2; text-align: left; padding: 48px; max-width: 420px; }
    .auth-eyebrow { font-family: 'Inter', sans-serif; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #d8b4fe; opacity: 0.85; margin-bottom: 18px; }
    .auth-headline { font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 800; line-height: 1.12; color: #fdfaff; letter-spacing: -0.02em; margin-bottom: 16px; }
    .auth-headline span { background: linear-gradient(90deg, #f5b942, #ab68ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .auth-sub { font-size: 15px; line-height: 1.65; color: #c7bbe0; max-width: 340px; }
    .wingwrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 1; opacity: 0.9; }
    .wing-path { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 900; stroke-dashoffset: 900; animation: draw 2.2s cubic-bezier(.2,.7,.2,1) forwards; }
    .wing-path.p2 { animation-delay: 0.15s; }
    .wing-path.p3 { animation-delay: 0.3s; }
    .wing-glow { animation: glow 4s ease-in-out infinite 2.4s; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes glow { 0%,100% { opacity: 0.35; } 50% { opacity: 0.7; } }
    .auth-form-side { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px; }
    .auth-card { width: 100%; max-width: 380px; animation: cardIn 0.5s cubic-bezier(.2,.8,.3,1) both; }
    @keyframes cardIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    .auth-card-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: ${t.text}; margin-bottom: 6px; transition: color 0.3s; }
    .auth-card-sub { font-size: 13px; color: ${t.subText}; margin-bottom: 28px; }
    .auth-google-btn { width: 100%; height: 46px; border-radius: 12px; border: 1px solid ${t.inputBorder}; background: ${t.bg}; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: background 0.2s, border-color 0.2s, transform 0.1s; }
    .auth-google-btn:hover { background: ${t.inputBg}; border-color: ${t.inputHoverBorder}; }
    .auth-google-btn:active { transform: scale(0.98); }
    .auth-divider { display: flex; align-items: center; gap: 12px; margin: 22px 0; color: ${t.dimText}; font-size: 12px; }
    .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: ${t.inputBorder}; }
    .auth-field { margin-bottom: 14px; }
    .auth-field label { display: block; font-size: 12px; color: ${t.subText}; margin-bottom: 6px; letter-spacing: 0.02em; }
    .auth-field input { width: 100%; height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s, background 0.3s; box-sizing: border-box; }
    .auth-field input:focus { border-color: #ab68ff; }
    .auth-submit { width: 100%; height: 46px; border-radius: 12px; border: none; background: linear-gradient(90deg, #ab68ff, #8b3cff); color: #fff; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s, transform 0.1s; }
    .auth-submit:hover:not(:disabled) { opacity: 0.9; }
    .auth-submit:active:not(:disabled) { transform: scale(0.98); }
    .auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .auth-toggle { text-align: center; font-size: 13px; color: ${t.subText}; margin-top: 22px; }
    .auth-toggle button { background: none; border: none; color: #ab68ff; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; margin-left: 4px; }
    .auth-toggle button:hover { text-decoration: underline; }
    .auth-message { font-size: 13px; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; animation: msgIn 0.25s ease both; }
    @keyframes msgIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    .auth-message.error { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
    .auth-message.info { background: rgba(16,163,127,0.1); color: #10a37f; border: 1px solid rgba(16,163,127,0.25); }
    .auth-mobile-brand { display: none; }
    @media (max-width: 900px) {
      .auth-panel { display: none; }
      .auth-form-side { padding: 24px; }
      .auth-mobile-brand { display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 28px; }
      .auth-mobile-brand span:first-child { font-size: 26px; }
      .auth-mobile-brand span:last-child { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; color: ${t.text}; }
    }
    @media (prefers-reduced-motion: reduce) {
      .wing-path { animation: none; stroke-dashoffset: 0; }
      .wing-glow { animation: none; }
      .auth-card { animation: none; }
    }
  `;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  );
}

// The signature moment: a wing sweeping open, built from three layered
// stroke paths that draw themselves in on mount. Ties the auth gate back
// to Garuda without leaning on a literal eagle illustration.
function WingSignature() {
  return (
    <svg className="wing-glow" width="480" height="480" viewBox="0 0 480 480" fill="none">
      <path className="wing-path p1" d="M240 380 C160 340, 90 260, 60 150 C140 180, 200 220, 240 300" stroke="#8b3cff" strokeWidth="2.5" />
      <path className="wing-path p2" d="M240 380 C170 320, 120 230, 110 110 C175 160, 215 220, 240 300" stroke="#ab68ff" strokeWidth="2.5" />
      <path className="wing-path p3" d="M240 380 C185 300, 160 200, 175 80 C220 145, 235 220, 240 300" stroke="#f5b942" strokeWidth="2.5" />
      <path className="wing-path p2" d="M240 380 C320 340, 390 260, 420 150 C340 180, 280 220, 240 300" stroke="#8b3cff" strokeWidth="2.5" style={{ animationDelay: "0.2s" }} />
      <path className="wing-path p3" d="M240 380 C310 320, 360 230, 370 110 C305 160, 265 220, 240 300" stroke="#ab68ff" strokeWidth="2.5" style={{ animationDelay: "0.35s" }} />
      <circle cx="240" cy="380" r="4" fill="#f5b942" className="wing-path p1" style={{ strokeDasharray: 0 }} />
    </svg>
  );
}

export default function AuthScreen({ t, isDark, onToggleTheme }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleGoogle = async () => {
    setError(""); setInfo(""); setGoogleLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (err) { setError(err.message); setGoogleLoading(false); }
    // On success the browser redirects away, so no need to reset loading here.
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (!email || !password) { setError("Enter both an email and a password."); return; }
    if (mode === "signup" && password.length < 6) { setError("Password should be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setInfo("Account created — check your inbox to confirm your email before signing in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <style>{buildAuthCSS(t)}</style>

      <div className="auth-panel">
        <div className="wingwrap"><WingSignature /></div>
        <div className="auth-panel-inner">
          <div className="auth-eyebrow">Garuda AI</div>
          <div className="auth-headline">Ask further.<br /><span>Fly faster.</span></div>
          <div className="auth-sub">
            One account, every conversation saved and synced — sign in to pick up exactly where you left off.
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mobile-brand"><span>🦅</span><span>Garuda AI</span></div>

          <div className="auth-card-title">{mode === "signin" ? "Welcome back" : "Create your account"}</div>
          <div className="auth-card-sub">
            {mode === "signin" ? "Sign in to continue the conversation." : "Takes less than a minute."}
          </div>

          {error && <div className="auth-message error">{error}</div>}
          {info && <div className="auth-message info">{info}</div>}

          <button className="auth-google-btn" onClick={handleGoogle} disabled={googleLoading} type="button">
            {googleLoading ? <span className="auth-spinner" style={{ borderTopColor: t.text, borderColor: `${t.text}44` }} /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="auth-divider">or use your email</div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading && <span className="auth-spinner" />}
              {mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <div className="auth-toggle">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setInfo(""); }}>
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}