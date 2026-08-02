import { useState, useRef, useEffect } from "react";
import { supabase } from "./database";
import AuthScreen from "./Authscreen";
import FormattedMessage from "./FormattedMessage";

const DARK = {
  bg: "#212121", text: "#ececec", subText: "#8e8ea0", dimText: "#4a4a5a",
  inputBg: "#2f2f2f", inputBorder: "#3a3a3a", inputHoverBorder: "#666",
  userPillBg: "#2f2f2f", userPillBorder: "#3a3a3a", userText: "#ececec",
  assistantText: "#d1d1d1", sendBtnBg: "#ffffff", sendBtnText: "#212121",
  sendBtnDisabled: "#3a3a3a", avatarBot: "#ab68ff", hintText: "#3a3a4a",
  chipBg: "transparent", chipBorder: "#3a3a3a", chipHoverBg: "#2f2f2f",
  modalBg: "#2f2f2f", modalOverlay: "rgba(0,0,0,0.8)", scrollThumb: "#3a3a3a",
  topbarBorder: "#2a2a2a", codeBg: "#181818", codeHeadBg: "#242424",
};

const LIGHT = {
  bg: "#ffffff", text: "#0d0d0d", subText: "#6e6e80", dimText: "#acacbe",
  inputBg: "#f4f4f5", inputBorder: "#e5e5e5", inputHoverBorder: "#aaa",
  userPillBg: "#f4f4f5", userPillBorder: "#e5e5e5", userText: "#0d0d0d",
  assistantText: "#374151", sendBtnBg: "#0d0d0d", sendBtnText: "#ffffff",
  sendBtnDisabled: "#e5e5e5", avatarBot: "#ab68ff", hintText: "#d1d1d1",
  chipBg: "transparent", chipBorder: "#e5e5e5", chipHoverBg: "#f4f4f5",
  modalBg: "#f4f4f5", modalOverlay: "rgba(0,0,0,0.4)", scrollThumb: "#e5e5e5",
  topbarBorder: "#f0f0f0", codeBg: "#f6f6f7", codeHeadBg: "#ececee",
};

function buildCSS(t) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; max-width: none; margin: 0; padding: 0; text-align: left; }
    body { font-family: 'Inter', sans-serif; background: ${t.bg}; color: ${t.text}; overflow: hidden; transition: background 0.3s, color 0.3s; }
    .shell { height: 100vh; display: flex; flex-direction: column; align-items: stretch; animation: shellIn 0.4s cubic-bezier(.2,.8,.3,1) both; }
    @keyframes shellIn { from { opacity: 0; } to { opacity: 1; } }
    .splash { height: 100vh; display: flex; align-items: center; justify-content: center; background: ${t.bg}; }
    .splash-eagle { font-size: 40px; animation: pulseScale 1.4s ease-in-out infinite; }
    @keyframes pulseScale { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.12); opacity: 1; } }
    .topbar { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid ${t.topbarBorder}; background: ${t.bg}; z-index: 10; transition: background 0.3s, border-color 0.3s; }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand-icon { font-size: 20px; display: inline-block; animation: soar 6s ease-in-out infinite; }
    @keyframes soar { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(-4deg); } }
    .brand-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: ${t.text}; letter-spacing: 0.01em; transition: color 0.3s; }
    .topbar-right { display: flex; align-items: center; gap: 8px; position: relative; }
    .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease, border-color 0.18s ease; }
    .icon-btn:hover { background: ${t.inputBg}; color: ${t.text}; transform: translateY(-1px); }
    .icon-btn:active { transform: translateY(0) scale(0.94); }
    .dev-btn { height: 32px; padding: 0 14px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease; }
    .dev-btn:hover { background: ${t.inputBg}; color: ${t.text}; transform: translateY(-1px); }
    .dev-btn:active { transform: translateY(0) scale(0.96); }
    .avatar-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid ${t.inputBorder}; background: linear-gradient(135deg,#ab68ff,#8b3cff); color: #fff; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease, box-shadow 0.2s ease; }
    .avatar-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(171,104,255,0.35); }
    .account-menu { position: absolute; top: 40px; right: 0; width: 220px; background: ${t.modalBg}; border: 1px solid ${t.inputBorder}; border-radius: 12px; padding: 10px; box-shadow: 0 16px 40px rgba(0,0,0,0.25); animation: menuIn 0.16s cubic-bezier(.2,.8,.3,1) both; z-index: 20; }
    @keyframes menuIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }
    .account-email { font-size: 12px; color: ${t.subText}; padding: 6px 8px 10px; word-break: break-all; border-bottom: 1px solid ${t.inputBorder}; margin-bottom: 6px; }
    .account-signout { width: 100%; text-align: left; padding: 9px 8px; border-radius: 8px; border: none; background: transparent; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 13px; cursor: pointer; transition: background 0.15s; }
    .account-signout:hover { background: ${t.inputBg}; }
    .conversation { flex: 1; width: 100%; overflow-y: auto; padding: 32px 24px 16px; display: flex; flex-direction: column; scroll-behavior: smooth; }
    .conversation::-webkit-scrollbar { width: 5px; }
    .conversation::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 3px; }
    .welcome { margin: auto; text-align: center; padding: 20px 16px; animation: wIn 0.5s cubic-bezier(.2,.8,.3,1) both; }
    @keyframes wIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
    .welcome-eagle { font-size: 52px; margin-bottom: 20px; display: block; animation: float 5s ease-in-out infinite; }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    .welcome-title { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800; color: ${t.text}; margin-bottom: 10px; letter-spacing: -0.02em; transition: color 0.3s; }
    .welcome-sub { font-size: 14px; color: ${t.subText}; margin-bottom: 32px; line-height: 1.6; transition: color 0.3s; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .chip { font-size: 13px; padding: 9px 18px; border-radius: 999px; border: 1px solid ${t.chipBorder}; background: ${t.chipBg}; color: ${t.subText}; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.15s ease; }
    .chip:hover { background: ${t.chipHoverBg}; color: ${t.text}; border-color: ${t.inputHoverBorder}; transform: translateY(-2px); }
    .chip:active { transform: translateY(0) scale(0.97); }
    .msg-block { padding: 18px 0; animation: mIn 0.35s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes mIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    .msg-block.user { display: flex; justify-content: flex-end; }
    .user-pill { max-width: 72%; background: ${t.userPillBg}; border: 1px solid ${t.userPillBorder}; border-radius: 20px; padding: 12px 18px; font-size: 15px; line-height: 1.65; color: ${t.userText}; white-space: pre-wrap; word-break: break-word; transition: background 0.3s, color 0.3s; }
    .msg-block.bot { display: flex; gap: 14px; align-items: flex-start; }
    .bot-avatar { width: 26px; height: 26px; border-radius: 6px; background: ${t.avatarBot}18; border: 1px solid ${t.avatarBot}30; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; margin-top: 3px; animation: avatarPop 0.35s cubic-bezier(.34,1.56,.64,1) both; }
    @keyframes avatarPop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .bot-content { flex: 1; font-size: 15px; line-height: 1.78; color: ${t.assistantText}; word-break: break-word; padding-top: 1px; transition: color 0.3s; min-width: 0; }
    .bot-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .speak-btn { width: 26px; height: 26px; border-radius: 7px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.12s ease; align-self: flex-start; }
    .speak-btn:hover { background: ${t.inputBg}; color: ${t.text}; transform: translateY(-1px); }
    .speak-btn:active { transform: translateY(0) scale(0.94); }
    .speak-btn.speaking { color: ${t.avatarBot}; border-color: ${t.avatarBot}55; background: ${t.avatarBot}14; }
    .typing-block { display: flex; gap: 14px; align-items: flex-start; padding: 18px 0; animation: mIn 0.25s ease both; }
    .typing-dots { display: flex; gap: 4px; align-items: center; padding-top: 5px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: ${t.subText}; animation: blink 1.4s ease-in-out infinite; }
    .dot:nth-child(2){animation-delay:.2s} .dot:nth-child(3){animation-delay:.4s}
    @keyframes blink { 0%,60%,100%{opacity:.15;transform:scale(.85)} 30%{opacity:1;transform:scale(1)} }
    .input-wrapper { width: 100%; padding: 10px 24px 20px; }
    .input-box { background: ${t.inputBg}; border: 1px solid ${t.inputBorder}; border-radius: 16px; padding: 12px 12px 12px 18px; display: flex; align-items: flex-end; gap: 10px; transition: border-color 0.2s ease, background 0.3s, box-shadow 0.2s ease; }
    .input-box:focus-within { border-color: ${t.inputHoverBorder}; box-shadow: 0 0 0 3px ${t.avatarBot}14; }
    textarea { flex: 1; background: none; border: none; outline: none; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; resize: none; min-height: 24px; max-height: 180px; overflow-y: auto; caret-color: ${t.text}; transition: color 0.3s; }
    textarea::placeholder { color: ${t.dimText}; }
    .send-btn { width: 34px; height: 34px; border-radius: 8px; border: none; background: ${t.sendBtnBg}; color: ${t.sendBtnText}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s ease, transform 0.12s ease, background 0.3s; }
    .send-btn:hover:not(:disabled) { opacity: 0.82; transform: translateY(-1px); }
    .send-btn:active:not(:disabled) { transform: scale(0.92); }
    .send-btn:disabled { background: ${t.sendBtnDisabled}; color: ${t.subText}; cursor: not-allowed; opacity: 0.5; }
    .status-badge { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid ${t.inputBorder}; background: transparent; font-family: 'Inter', sans-serif; font-size: 12px; color: ${t.subText}; }
    .sdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; transition: background 0.4s, box-shadow 0.4s; }
    .sdot.online { background: #10a37f; box-shadow: 0 0 6px #10a37f99; animation: spulse 2.5s ease-in-out infinite; }
    .sdot.offline { background: #ef4444; box-shadow: 0 0 6px #ef444488; animation: none; }
    @keyframes spulse { 0%,100%{box-shadow:0 0 3px #10a37f66} 50%{box-shadow:0 0 10px #10a37f} }
    .hint { text-align: center; font-size: 11px; color: ${t.hintText}; margin-top: 10px; letter-spacing: 0.02em; transition: color 0.3s; }
    .modal-overlay { position: fixed; inset: 0; background: ${t.modalOverlay}; display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(8px); animation: fadeO 0.2s both; }
    @keyframes fadeO{from{opacity:0}to{opacity:1}}
    .modal { background: ${t.modalBg}; border: 1px solid ${t.inputBorder}; border-radius: 20px; width: 300px; padding: 32px 24px 24px; position: relative; text-align: center; animation: slideU 0.25s cubic-bezier(.34,1.56,.64,1) both; box-shadow: 0 24px 60px rgba(0,0,0,0.4); transition: background 0.3s; }
    @keyframes slideU{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    .modal-close { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 6px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: background 0.15s; }
    .modal-close:hover { background: ${t.inputBg}; }
    .modal-eagle { font-size: 40px; margin-bottom: 12px; display: block; }
    .modal-name { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: ${t.text}; margin-bottom: 4px; transition: color 0.3s; }
    .modal-label { font-size: 11px; color: ${t.subText}; margin-bottom: 20px; letter-spacing: 0.06em; }
    .modal-divider { height: 1px; background: ${t.inputBorder}; margin: 0 0 20px; }
    .modal-insta { display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 10px; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 13px; text-decoration: none; transition: opacity 0.15s; }
    .modal-insta:hover { opacity: 0.7; }
    .insta-icon { width: 18px; height: 18px; background: linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888); border-radius: 5px; display: flex; align-items: center; justify-content: center; }
    .insta-icon svg { width: 11px; height: 11px; fill: #fff; }
    .modal-built { margin-top: 16px; font-size: 10px; color: ${t.dimText}; letter-spacing: 0.08em; }

    /* Formatted (markdown-lite) AI reply content */
    .md-body { display: flex; flex-direction: column; gap: 10px; }
    .md-p { margin: 0; }
    .md-h { font-family: 'Syne', sans-serif; font-weight: 800; color: ${t.text}; line-height: 1.3; margin-top: 4px; }
    .md-h3 { font-size: 17px; }
    .md-h4 { font-size: 16px; }
    .md-h5 { font-size: 15px; }
    .md-ul, .md-ol { padding-left: 22px; display: flex; flex-direction: column; gap: 6px; }
    .md-ul li, .md-ol li { padding-left: 2px; }
    .md-strong { color: ${t.text}; font-weight: 700; }
    .md-em { font-style: italic; }
    .md-inline-code { font-family: ui-monospace, Consolas, monospace; font-size: 0.88em; background: ${t.codeBg}; padding: 2px 6px; border-radius: 5px; color: ${t.text}; }
    .md-link { color: ${t.avatarBot}; text-decoration: underline; text-underline-offset: 2px; }
    .md-code-block { border: 1px solid ${t.inputBorder}; border-radius: 10px; overflow: hidden; margin: 2px 0; }
    .md-code-head { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: ${t.codeHeadBg}; font-family: ui-monospace, Consolas, monospace; font-size: 11px; color: ${t.subText}; text-transform: lowercase; }
    .md-copy-btn { background: transparent; border: 1px solid ${t.inputBorder}; color: ${t.subText}; font-family: 'Inter', sans-serif; font-size: 11px; padding: 3px 9px; border-radius: 6px; cursor: pointer; transition: background 0.15s, color 0.15s; }
    .md-copy-btn:hover { background: ${t.inputBg}; color: ${t.text}; }
    .md-code-block pre { margin: 0; padding: 12px 14px; overflow-x: auto; background: ${t.codeBg}; }
    .md-code-block code { font-family: ui-monospace, Consolas, monospace; font-size: 13px; line-height: 1.6; color: ${t.text}; white-space: pre; }

    /* Mode switcher: stacked toggle embedded in the message input row */
    .mode-fab { position: relative; flex-shrink: 0; }
    .mode-options { position: absolute; bottom: 44px; left: 0; display: flex; flex-direction: column-reverse; gap: 8px; z-index: 5; }
    .mode-option { position: relative; width: 34px; height: 34px; border-radius: 50%; border: 1px solid ${t.inputBorder}; background: ${t.modalBg}; color: ${t.text}; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,0.28); animation: modePop 0.22s cubic-bezier(.34,1.56,.64,1) both; transition: transform 0.15s ease, box-shadow 0.2s ease; }
    .mode-option:hover { transform: translateY(-2px) scale(1.06); }
    .mode-option:active { transform: translateY(0) scale(0.94); }
    .mode-option.active { box-shadow: 0 0 0 3px var(--glow), 0 0 14px var(--glow), 0 6px 18px rgba(0,0,0,0.28); animation: modePop 0.22s cubic-bezier(.34,1.56,.64,1) both, modeGlow 2.2s ease-in-out infinite; }
    @keyframes modePop { from { opacity: 0; transform: translateY(10px) scale(0.6); } to { opacity: 1; transform: none; } }
    @keyframes modeGlow { 0%,100% { box-shadow: 0 0 0 3px var(--glow), 0 0 10px var(--glow), 0 6px 18px rgba(0,0,0,0.28); } 50% { box-shadow: 0 0 0 3px var(--glow), 0 0 22px var(--glow), 0 6px 18px rgba(0,0,0,0.28); } }
    .mode-option-tip { position: absolute; left: 42px; top: 50%; transform: translateY(-50%); font-size: 11px; white-space: nowrap; background: ${t.modalBg}; border: 1px solid ${t.inputBorder}; padding: 4px 9px; border-radius: 6px; opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
    .mode-option:hover .mode-option-tip { opacity: 1; }
    .mode-stack { position: relative; width: 34px; height: 34px; cursor: pointer; }
    .mode-stack-circle { position: absolute; inset: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 1px solid ${t.inputBorder}; background: ${t.modalBg}; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .mode-stack-circle.back { transform: translate(4px, 4px) scale(0.9); opacity: 0.65; }
    .mode-stack-circle.front { box-shadow: 0 0 0 3px var(--glow), 0 0 10px var(--glow), 0 2px 8px rgba(0,0,0,0.2); }
    .mode-stack:hover .mode-stack-circle.front { transform: translateY(-2px); }
    .mode-stack.open .mode-stack-circle.front { transform: scale(0); opacity: 0; }
    .mode-stack.open .mode-stack-circle.back { transform: scale(0); opacity: 0; }

    @media (prefers-reduced-motion: reduce) {
      .shell, .msg-block, .welcome, .welcome-eagle, .brand-icon, .modal, .modal-overlay,
      .chip, .send-btn, .icon-btn, .dev-btn, .account-menu, .bot-avatar, .mode-option, .mode-stack-circle { animation: none !important; transition: none !important; }
    }
  `;
}

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M.5 1.163A1 1 0 0 1 1.97.28l12.868 6.837a1 1 0 0 1 0 1.766L1.969 15.72A1 1 0 0 1 .5 14.836V10.33a1 1 0 0 1 .816-.983L8.5 8 1.316 6.653A1 1 0 0 1 .5 5.67V1.163z"/>
  </svg>
);

const SpeakerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3z"/>
    <path d="M16.5 12c0-1.77-.77-3.29-2-4.24v8.48c1.23-.95 2-2.47 2-4.24z" opacity="0.9"/>
    <path d="M14.5 3.23v2.06c2.89 1.15 5 4.14 5 7.71s-2.11 6.56-5 7.71v2.06c4.01-1.24 7-5.06 7-9.77s-2.99-8.53-7-9.77z" opacity="0.6"/>
  </svg>
);

const StopIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);

// Strips markdown syntax so the speech engine reads clean prose instead of
// literal asterisks, backticks, hashes, and bullet markers.
function stripMarkdownForSpeech(text) {
  return text
    .replace(/```[\s\S]*?```/g, " code block. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

const CHIPS = ["Who are you?", "What can you help with?", "Tell me something interesting", "Help me write something"];

const MODES = [
  { id: "education", label: "Education Mode", icon: "📘", glow: "#4f8cff" },
  { id: "love", label: "Love Mode", icon: "❤️", glow: "#ff4f81" },
];

export default function App() {
  const [text, setText] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [showDev, setShowDev] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [mode, setMode] = useState("education");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const modeRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  const t = isDark ? DARK : LIGHT;

  useEffect(() => {
    if (!modeMenuOpen) return;
    const onDocClick = (e) => {
      if (modeRef.current && !modeRef.current.contains(e.target)) setModeMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [modeMenuOpen]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [text]);

  const send = async (msgOverride) => {
    const msg = (msgOverride || text).trim();
    if (!msg || loading) return;
    setChat(p => [...p, { type: "user", text: msg }]);
    setText("");
    setLoading(true);
    try {
      const res = await fetch("https://garud-ai.onrender.com/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: msg, mode }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setChat(p => [...p, { type: "bot", text: data.reply ?? "Sorry, I didn't get a valid response." }]);
    } catch {
      setChat(p => [...p, { type: "bot", text: "Could not reach the server. Please try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const toggleSpeak = (index, rawText) => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech isn't supported in this browser.");
      return;
    }
    const synth = window.speechSynthesis;
    if (speakingIndex === index) {
      synth.cancel();
      setSpeakingIndex(null);
      return;
    }
    synth.cancel();
    // Chrome silently drops speak() if called in the same tick as cancel();
    // a short delay avoids that race condition.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(rawText));
      utterance.rate = 1;
      utterance.pitch = 1;
      synth.speak(utterance);
      setSpeakingIndex(index);

      // Chrome bug: long utterances silently pause after ~14s unless nudged.
      const keepAlive = setInterval(() => {
        if (!synth.speaking) { clearInterval(keepAlive); return; }
        synth.pause();
        synth.resume();
      }, 10000);
      utterance.onend = () => { clearInterval(keepAlive); setSpeakingIndex(null); };
      utterance.onerror = () => { clearInterval(keepAlive); setSpeakingIndex(null); };
    }, 60);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const hasText = text.trim().length > 0;
  const handleSignOut = async () => { setShowAccount(false); window.speechSynthesis?.cancel(); setSpeakingIndex(null); await supabase.auth.signOut(); setChat([]); };
  const initial = (session?.user?.email || "?").charAt(0).toUpperCase();

  if (!authChecked) {
    return (
      <div className="splash">
        <style>{buildCSS(t)}</style>
        <span className="splash-eagle">🦅</span>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen t={t} isDark={isDark} onToggleTheme={() => setIsDark(d => !d)} />;
  }

  return (
    <>
      <style>{buildCSS(t)}</style>

      {showDev && (
        <div className="modal-overlay" onClick={() => setShowDev(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDev(false)}>✕</button>
            <span className="modal-eagle">🦅</span>
            <div className="modal-name">Ritesh Sharma</div>
            <div className="modal-label">Developer · Garuda AI</div>
            <div className="modal-divider"/>
            <a className="modal-insta" href="https://instagram.com/ritesh.jns" target="_blank" rel="noopener noreferrer">
              <div className="insta-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </div>
              @ritesh.jns
            </a>
            <div className="modal-built">Built with 🦅 and precision</div>
          </div>
        </div>
      )}

      <div className="shell">
        <div className="topbar">
          <div className="brand">
            <span className="brand-icon">🦅</span>
            <span className="brand-name">Garuda AI</span>
          </div>
          <div className="topbar-right">
            <div className="status-badge">
              <span className={`sdot ${isOnline ? "online" : "offline"}`} />
              {isOnline ? "online" : "offline"}
            </div>
            <button className="icon-btn" onClick={() => setIsDark(d => !d)}>{isDark ? "☀️" : "🌙"}</button>
            <button className="dev-btn" onClick={() => setShowDev(true)}>Developer</button>
            <button className="avatar-btn" onClick={() => setShowAccount(v => !v)}>{initial}</button>
            {showAccount && (
              <div className="account-menu" onMouseLeave={() => setShowAccount(false)}>
                <div className="account-email">{session.user.email}</div>
                <button className="account-signout" onClick={handleSignOut}>Sign out</button>
              </div>
            )}
          </div>
        </div>

        <div className="conversation">
          {chat.length === 0 && (
            <div className="welcome">
              <span className="welcome-eagle">🦅</span>
              <div className="welcome-title">What can I help with?</div>
              <div className="welcome-sub">Garuda AI is ready — ask me anything.</div>
              <div className="chips">
                {CHIPS.map(c => <button key={c} className="chip" onClick={() => send(c)}>{c}</button>)}
              </div>
            </div>
          )}

          {chat.map((m, i) => (
            <div key={i} className={`msg-block ${m.type}`} style={{ animationDelay: `${Math.min(i, 4) * 0.03}s` }}>
              {m.type === "user" ? (
                <div className="user-pill">{m.text}</div>
              ) : (
                <>
                  <div className="bot-avatar">🦅</div>
                  <div className="bot-wrap">
                    <div className="bot-content"><FormattedMessage text={m.text} /></div>
                    <button
                      className={`speak-btn ${speakingIndex === i ? "speaking" : ""}`}
                      onClick={() => toggleSpeak(i, m.text)}
                      title={speakingIndex === i ? "Stop reading" : "Read aloud"}
                      type="button"
                    >
                      {speakingIndex === i ? <StopIcon /> : <SpeakerIcon />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {loading && (
            <div className="typing-block">
              <div className="bot-avatar">🦅</div>
              <div className="typing-dots">
                <div className="dot"/><div className="dot"/><div className="dot"/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div className="input-wrapper">
          <div className="input-box">
            <div className="mode-fab" ref={modeRef}>
              {modeMenuOpen && (
                <div className="mode-options">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`mode-option ${mode === m.id ? "active" : ""}`}
                      style={{ "--glow": m.glow }}
                      onClick={() => { setMode(m.id); setModeMenuOpen(false); }}
                    >
                      {m.icon}
                      <span className="mode-option-tip">{m.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div
                className={`mode-stack ${modeMenuOpen ? "open" : ""}`}
                onClick={() => setModeMenuOpen(v => !v)}
              >
                <div
                  className="mode-stack-circle back"
                  style={{ "--glow": (MODES.find(m => m.id !== mode) || MODES[0]).glow }}
                >
                  {(MODES.find(m => m.id !== mode) || MODES[0]).icon}
                </div>
                <div
                  className="mode-stack-circle front"
                  style={{ "--glow": (MODES.find(m => m.id === mode) || MODES[0]).glow }}
                >
                  {(MODES.find(m => m.id === mode) || MODES[0]).icon}
                </div>
              </div>
            </div>
            <textarea
              ref={textareaRef} rows={1} value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message Garuda AI"
              disabled={loading} autoFocus
            />
            <button className="send-btn" onClick={() => send()} disabled={!hasText || loading}>
              <SendIcon />
            </button>
          </div>
          <div className="hint">Garuda AI · garud-ai.onrender.com · Shift+Enter for new line</div>
        </div>
      </div>
    </>
  );
}