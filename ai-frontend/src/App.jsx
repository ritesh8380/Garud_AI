import { useState, useRef, useEffect } from "react";

const LIGHT = {
  bg: "#f5f3ee",
  headerBorder: "#e2ddd6",
  headerBg: "#f5f3ee",
  text: "#1a1714",
  subText: "#8a8278",
  dimText: "#b5afa7",
  inputBg: "#ffffff",
  inputBorder: "#ddd8d0",
  inputFocusBorder: "#c0b9b0",
  userBubbleBg: "#1a1714",
  userBubbleText: "#f5f3ee",
  botBubbleText: "#2e2a26",
  dot: "#c0b9b0",
  sendBtnBg: "#1a1714",
  sendBtnText: "#f5f3ee",
  avatarBg: "#eee9e3",
  avatarBorder: "#ddd8d0",
  hintText: "#c5bfb7",
  statusDot: "#5a9e78",
  devBtnBg: "#1a1714",
  devBtnText: "#f5f3ee",
  modalBg: "#ffffff",
  modalOverlay: "rgba(26,23,20,0.55)",
  tagline: "#8a8278",
  knobBg: "#1a1714",
  trackBg: "#e8e2d9",
  trackBorder: "#ddd8d0",
};

const DARK = {
  bg: "#111",
  headerBorder: "#222",
  headerBg: "#111",
  text: "#ececec",
  subText: "#555",
  dimText: "#333",
  inputBg: "#1a1a1a",
  inputBorder: "#2a2a2a",
  inputFocusBorder: "#3a3a3a",
  userBubbleBg: "#1c1c1c",
  userBubbleText: "#e0e0e0",
  botBubbleText: "#ccc",
  dot: "#444",
  sendBtnBg: "#ffffff",
  sendBtnText: "#111",
  avatarBg: "#1e1e1e",
  avatarBorder: "#2a2a2a",
  hintText: "#2e2e2e",
  statusDot: "#3d9970",
  devBtnBg: "#ffffff",
  devBtnText: "#111",
  modalBg: "#1a1a1a",
  modalOverlay: "rgba(0,0,0,0.7)",
  tagline: "#555",
  knobBg: "#ffffff",
  trackBg: "#2a2a2a",
  trackBorder: "#3a3a3a",
};

const getCSS = (t) => `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }

  body {
    font-family: 'DM Mono', monospace;
    background: ${t.bg};
    color: ${t.text};
    overflow: hidden;
    transition: background 0.3s, color 0.3s;
  }

  .shell {
    height: 100vh;
    display: flex;
    flex-direction: column;
    max-width: 720px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-bottom: 1px solid ${t.headerBorder};
    background: ${t.headerBg};
    transition: border-color 0.3s, background 0.3s;
  }

  .logo {
    width: 34px; height: 34px; border-radius: 50%;
    background: ${t.avatarBg};
    border: 1px solid ${t.avatarBorder};
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
    transition: background 0.3s, border-color 0.3s;
  }

  .brand-name {
    font-size: 15px; font-weight: 700;
    font-family: 'Syne', sans-serif;
    color: ${t.text}; letter-spacing: 0.04em;
    transition: color 0.3s;
  }

  .status {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: ${t.subText};
    transition: color 0.3s;
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: ${t.statusDot};
    box-shadow: 0 0 6px ${t.statusDot}88;
  }

  .header-controls {
    margin-left: auto;
    display: flex; align-items: center; gap: 8px;
  }

  /* Pill toggle track */
  .theme-track {
    width: 52px; height: 28px; border-radius: 999px;
    border: 1.5px solid ${t.trackBorder};
    background: ${t.trackBg};
    cursor: pointer;
    display: flex; align-items: center;
    padding: 3px;
    position: relative;
    flex-shrink: 0;
    transition: background 0.3s, border-color 0.3s;
  }
  .theme-knob {
    width: 20px; height: 20px; border-radius: 50%;
    background: ${t.knobBg};
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
    transition: transform 0.28s cubic-bezier(.34,1.56,.64,1), background 0.3s;
    transform: translateX(0px);
    flex-shrink: 0;
  }
  .theme-knob.moved { transform: translateX(24px); }

  /* Developer button — rectangular with rounded corners */
  .dev-btn {
    height: 28px; padding: 0 12px;
    border-radius: 8px;
    border: 1.5px solid ${t.devBtnBg};
    background: ${t.devBtnBg};
    color: ${t.devBtnText};
    font-family: 'DM Mono', monospace;
    font-size: 11px; font-weight: 500;
    cursor: pointer; display: flex; align-items: center; gap: 5px;
    flex-shrink: 0; letter-spacing: 0.03em;
    transition: opacity 0.15s, transform 0.1s, background 0.3s, border-color 0.3s, color 0.3s;
    white-space: nowrap;
  }
  .dev-btn:hover { opacity: 0.82; }
  .dev-btn:active { transform: scale(0.96); }

  .chat {
    flex: 1; overflow-y: auto;
    padding: 28px 20px 16px;
    display: flex; flex-direction: column; gap: 20px;
    scroll-behavior: smooth;
  }
  .chat::-webkit-scrollbar { width: 4px; }
  .chat::-webkit-scrollbar-thumb { background: ${t.inputBorder}; border-radius: 4px; }

  .empty {
    margin: auto; text-align: center;
    color: ${t.subText}; padding: 0 20px;
  }
  .empty-icon {
    width: 64px; height: 64px; border-radius: 50%;
    background: ${t.avatarBg}; border: 1px solid ${t.avatarBorder};
    display: flex; align-items: center; justify-content: center;
    font-size: 30px; margin: 0 auto 14px;
    box-shadow: 0 0 32px ${t.statusDot}22;
    transition: background 0.3s, border-color 0.3s;
  }
  .empty-title {
    font-size: 18px; font-weight: 700;
    font-family: 'Syne', sans-serif;
    color: ${t.text}; letter-spacing: 0.02em;
    transition: color 0.3s;
  }
  .empty-tagline {
    font-size: 11px; color: ${t.tagline};
    margin-top: 8px; letter-spacing: 0.06em;
    font-style: italic; line-height: 1.6;
    transition: color 0.3s;
  }
  .empty-sub { font-size: 11px; color: ${t.dimText}; margin-top: 14px; transition: color 0.3s; }

  .row { display: flex; gap: 12px; animation: fadein 0.2s ease both; }
  @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  .row.user { flex-direction: row-reverse; }

  .avatar {
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0; margin-top: 2px;
    background: ${t.avatarBg}; border: 1px solid ${t.avatarBorder};
    transition: background 0.3s, border-color 0.3s;
  }
  .avatar.user-av { font-size: 11px; color: ${t.subText}; font-family: 'Syne', sans-serif; font-weight: 700; }

  .bubble {
    max-width: 78%; font-size: 13.5px;
    line-height: 1.75; color: ${t.botBubbleText};
    transition: color 0.3s;
  }
  .row.user .bubble {
    background: ${t.userBubbleBg}; border: 1px solid ${t.userBubbleBg};
    padding: 10px 14px; border-radius: 14px; border-bottom-right-radius: 4px;
    color: ${t.userBubbleText}; transition: background 0.3s, color 0.3s;
  }
  .row.bot .bubble { padding: 4px 0; }

  .typing { display: flex; gap: 12px; animation: fadein 0.2s both; }
  .typing-dots { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
  .dot {
    width: 5px; height: 5px; border-radius: 50%; background: ${t.dot};
    animation: bounce 1.3s ease-in-out infinite; transition: background 0.3s;
  }
  .dot:nth-child(2){animation-delay:.15s} .dot:nth-child(3){animation-delay:.3s}
  @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}

  .input-area { padding: 10px 20px 18px; }
  .input-box {
    display: flex; align-items: center; gap: 8px;
    background: ${t.inputBg}; border: 1px solid ${t.inputBorder};
    border-radius: 12px; padding: 8px 8px 8px 16px;
    transition: border-color 0.15s, background 0.3s;
  }
  .input-box:focus-within { border-color: ${t.inputFocusBorder}; }

  input {
    flex: 1; background: none; border: none; outline: none;
    color: ${t.text}; font-family: 'DM Mono', monospace; font-size: 13px;
    caret-color: ${t.subText}; transition: color 0.3s;
  }
  input::placeholder { color: ${t.dimText}; }

  .send-btn {
    display: flex; align-items: center; justify-content: center; gap: 5px;
    height: 34px; padding: 0 14px; border-radius: 999px;
    border: 1.5px solid ${t.sendBtnBg}; background: ${t.sendBtnBg}; color: ${t.sendBtnText};
    font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500;
    cursor: pointer; flex-shrink: 0; white-space: nowrap; user-select: none;
    transition: opacity 0.15s, transform 0.1s, background 0.3s, border-color 0.3s, color 0.3s;
  }
  .send-btn:hover:not(:disabled){opacity:.85}
  .send-btn:active:not(:disabled){transform:scale(.96)}
  .send-btn:disabled{opacity:.22;cursor:not-allowed}

  .hint { margin-top: 8px; text-align: center; font-size: 11px; color: ${t.hintText}; transition: color 0.3s; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0;
    background: ${t.modalOverlay};
    display: flex; align-items: center; justify-content: center;
    z-index: 100; backdrop-filter: blur(4px);
    animation: fadeOv 0.2s both;
    transition: background 0.3s;
  }
  @keyframes fadeOv{from{opacity:0}to{opacity:1}}

  .modal {
    background: ${t.modalBg}; border: 1px solid ${t.inputBorder};
    border-radius: 20px; width: 320px; padding: 32px 28px 28px;
    position: relative; text-align: center;
    animation: slideUp 0.25s cubic-bezier(.34,1.56,.64,1) both;
    box-shadow: 0 24px 64px rgba(0,0,0,0.3);
    transition: background 0.3s, border-color 0.3s;
  }
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

  .modal-close {
    position: absolute; top: 14px; right: 14px;
    width: 28px; height: 28px; border-radius: 50%;
    border: 1px solid ${t.inputBorder}; background: ${t.avatarBg};
    color: ${t.subText}; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; transition: opacity 0.15s, background 0.3s, border-color 0.3s;
  }
  .modal-close:hover{opacity:.7}

  .modal-eagle { font-size: 40px; margin-bottom: 12px; display: block; }

  .modal-name {
    font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
    color: ${t.text}; letter-spacing: 0.02em; margin-bottom: 4px;
    transition: color 0.3s;
  }
  .modal-label {
    font-size: 10px; letter-spacing: 0.12em; color: ${t.subText};
    text-transform: uppercase; margin-bottom: 22px; transition: color 0.3s;
  }
  .modal-divider { height: 1px; background: ${t.inputBorder}; margin: 0 0 22px; transition: background 0.3s; }

  .modal-insta {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 9px 18px; border-radius: 8px;
    border: 1.5px solid ${t.inputBorder}; background: ${t.avatarBg};
    color: ${t.text}; font-family: 'DM Mono', monospace; font-size: 13px;
    text-decoration: none;
    transition: opacity 0.15s, background 0.3s, border-color 0.3s, color 0.3s;
  }
  .modal-insta:hover{opacity:.72}

  .insta-icon {
    width: 18px; height: 18px;
    background: linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);
    border-radius: 5px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .insta-icon svg { width: 11px; height: 11px; fill: #fff; }

  .modal-built { margin-top: 20px; font-size: 10px; color: ${t.dimText}; letter-spacing: 0.06em; transition: color 0.3s; }
`;

const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="13" x2="7" y2="1"/>
    <polyline points="2,6 7,1 12,6"/>
  </svg>
);

export default function App() {
  const [text, setText] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [showDev, setShowDev] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const t = isDark ? DARK : LIGHT;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || loading) return;
    setChat(p => [...p, { type: "user", text: msg }]);
    setText("");
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setChat(p => [...p, { type: "bot", text: data.reply }]);
    } catch {
      setChat(p => [...p, { type: "bot", text: "⚠ Could not reach server." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <>
      <style>{getCSS(t)}</style>

      {showDev && (
        <div className="modal-overlay" onClick={() => setShowDev(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDev(false)}>✕</button>
            <span className="modal-eagle">🦅</span>
            <div className="modal-name">Ritesh Sharma</div>
            <div className="modal-label">Developer · Garuda AI</div>
            <div className="modal-divider" />
            <a
              className="modal-insta"
              href="https://instagram.com/ritesh.jns"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="insta-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              @ritesh.jns
            </a>
            <div className="modal-built">Built with 🦅 and precision</div>
          </div>
        </div>
      )}

      <div className="shell">
        <header className="header">
          <div className="logo">🦅</div>
          <span className="brand-name">Garuda AI</span>
          <div className="status">
            <span className="status-dot" /> online
          </div>

          <div className="header-controls">
            {/* Dark/Light toggle pill */}
            <button
              className="theme-track"
              onClick={() => setIsDark(d => !d)}
              title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
              aria-label="Toggle theme"
            >
              <div className={`theme-knob${isDark ? "" : " moved"}`}>
                {isDark ? "🌙" : "☀️"}
              </div>
            </button>

            {/* Developer info — rectangular rounded button */}
            <button className="dev-btn" onClick={() => setShowDev(true)}>
              👨‍💻 Dev Info
            </button>
          </div>
        </header>

        <div className="chat">
          {chat.length === 0 && (
            <div className="empty">
              <div className="empty-icon">🦅</div>
              <div className="empty-title">How can I help you today?</div>
              <div className="empty-tagline">
                "Vision in the prompt · Precision in the strike"
              </div>
              <div className="empty-sub">Start typing below ↓</div>
            </div>
          )}

          {chat.map((m, i) => (
            <div key={i} className={`row ${m.type}`}>
              <div className={`avatar ${m.type === "bot" ? "bot-av" : "user-av"}`}>
                {m.type === "bot" ? "🦅" : "U"}
              </div>
              <div className="bubble">{m.text}</div>
            </div>
          ))}

          {loading && (
            <div className="typing">
              <div className="avatar bot-av">🦅</div>
              <div className="typing-dots">
                <div className="dot"/><div className="dot"/><div className="dot"/>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-box">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
              placeholder="Message Garuda AI…"
              disabled={loading}
              autoFocus
            />
            <button className="send-btn" onClick={send} disabled={!hasText || loading}>
              <SendIcon /> Send
            </button>
          </div>
          <div className="hint">Garuda AI · ↵ to send</div>
        </div>
      </div>
    </>
  );
}