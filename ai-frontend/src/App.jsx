import { useState, useRef, useEffect } from "react";
import {
  supabase,
  listConversations,
  createConversation,
  toggleConversationStar,
  deleteConversation,
  listMessages,
  saveMessage,
} from "./database";
import AuthScreen from "./Authscreen";
import FormattedMessage from "./FormattedMessage";
import Sidebar from "./Sidebar";
import DevCodeHelper from "./DevCodeHelper";

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
    .app-layout { height: 100vh; width: 100%; display: flex; overflow: hidden; }
    .shell { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; align-items: stretch; animation: shellIn 0.4s cubic-bezier(.2,.8,.3,1) both; }
    @keyframes shellIn { from { opacity: 0; } to { opacity: 1; } }

    /* Sidebar: saved conversations, star badge/filter at top, per-item actions */
    .sidebar { width: 260px; flex-shrink: 0; height: 100%; background: ${t.bg}; border-right: 1px solid ${t.topbarBorder}; display: flex; flex-direction: column; transition: margin-left 0.25s ease, background 0.3s, border-color 0.3s; }
    .sidebar.closed { margin-left: -260px; }
    .sidebar-top { display: flex; align-items: center; gap: 8px; padding: 14px 12px; border-bottom: 1px solid ${t.topbarBorder}; }
    .sidebar-new { flex: 1; height: 36px; border-radius: 10px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s ease, transform 0.12s ease; }
    .sidebar-new:hover { background: ${t.inputBg}; }
    .sidebar-new:active { transform: scale(0.97); }
    .sidebar-star-badge { position: relative; width: 36px; height: 36px; border-radius: 10px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
    .sidebar-star-badge:hover { background: ${t.inputBg}; color: ${t.text}; }
    .sidebar-star-badge.active { color: #f5b942; border-color: rgba(245,185,66,0.4); background: rgba(245,185,66,0.12); }
    .star-count { position: absolute; top: -5px; right: -5px; min-width: 15px; height: 15px; padding: 0 3px; border-radius: 999px; background: #f5b942; color: #1a1200; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; line-height: 1; }
    .sidebar-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
    .sidebar-list::-webkit-scrollbar { width: 5px; }
    .sidebar-list::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 3px; }
    .sidebar-empty { text-align: center; font-size: 12px; color: ${t.subText}; padding: 24px 12px; }
    .sidebar-item { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 9px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; color: ${t.subText}; transition: background 0.15s ease, color 0.15s ease; }
    .sidebar-item:hover { background: ${t.inputBg}; color: ${t.text}; }
    .sidebar-item.active { background: ${t.chipHoverBg}; color: ${t.text}; }
    .sidebar-item-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
    .sidebar-item-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s ease; }
    .sidebar-item:hover .sidebar-item-actions, .sidebar-item.active .sidebar-item-actions { opacity: 1; }
    .sidebar-icon-btn { width: 22px; height: 22px; border-radius: 6px; border: none; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, color 0.15s ease; }
    .sidebar-icon-btn:hover { background: ${t.chipHoverBg}; color: ${t.text}; }
    .sidebar-icon-btn.starred { color: #f5b942; }
    .sidebar-note { padding: 10px 14px; font-size: 10.5px; color: ${t.dimText}; text-align: center; border-top: 1px solid ${t.topbarBorder}; letter-spacing: 0.02em; }
    .sidebar-toggle-btn { display: flex; }
    .sidebar-backdrop { display: none; }
    @media (max-width: 860px) {
      .sidebar { position: fixed; top: 0; left: 0; z-index: 30; box-shadow: 0 0 40px rgba(0,0,0,0.3); max-width: 82vw; }
      .sidebar-backdrop { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 25; animation: fadeO 0.2s both; }
    }
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
    .msg-actions { display: flex; flex-direction: row; gap: 6px; align-self: flex-start; }
    .speak-btn { width: 26px; height: 26px; border-radius: 7px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.12s ease; align-self: flex-start; }
    .speak-btn:hover { background: ${t.inputBg}; color: ${t.text}; transform: translateY(-1px); }
    .speak-btn:active { transform: translateY(0) scale(0.94); }
    .speak-btn.speaking { color: ${t.avatarBot}; border-color: ${t.avatarBot}55; background: ${t.avatarBot}14; }
    .speak-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .typing-block { display: flex; gap: 14px; align-items: flex-start; padding: 18px 0; animation: mIn 0.25s ease both; }
    .typing-dots { display: flex; gap: 4px; align-items: center; padding-top: 5px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: ${t.subText}; animation: blink 1.4s ease-in-out infinite; }
    .dot:nth-child(2){animation-delay:.2s} .dot:nth-child(3){animation-delay:.4s}
    @keyframes blink { 0%,60%,100%{opacity:.15;transform:scale(.85)} 30%{opacity:1;transform:scale(1)} }
    .input-wrapper { width: 100%; padding: 10px 24px 20px; }
    .input-box { position: relative; background: ${t.inputBg}; border: 1px solid ${t.inputBorder}; border-radius: 16px; padding: 12px 12px 12px 18px; display: flex; align-items: flex-end; gap: 10px; transition: border-color 0.2s ease, background 0.3s, box-shadow 0.2s ease; }
    .input-box:focus-within { border-color: ${t.inputHoverBorder}; box-shadow: 0 0 0 3px ${t.avatarBot}14; }
    textarea { flex: 1; background: none; border: none; outline: none; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; resize: none; min-height: 24px; max-height: 180px; overflow-y: auto; caret-color: ${t.text}; transition: color 0.3s; }
    textarea::placeholder { color: ${t.dimText}; }
    .send-btn { width: 34px; height: 34px; border-radius: 8px; border: none; background: ${t.sendBtnBg}; color: ${t.sendBtnText}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s ease, transform 0.12s ease, background 0.3s; }
    .send-btn:hover:not(:disabled) { opacity: 0.82; transform: translateY(-1px); }
    .send-btn:active:not(:disabled) { transform: scale(0.92); }
    .send-btn:disabled { background: ${t.sendBtnDisabled}; color: ${t.subText}; cursor: not-allowed; opacity: 0.5; }
    .send-btn.stop-mode { background: #ef4444; color: #fff; opacity: 1; cursor: pointer; }
    .send-btn.stop-mode:hover { opacity: 0.85; }
    .status-badge { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid ${t.inputBorder}; background: transparent; font-family: 'Inter', sans-serif; font-size: 12px; color: ${t.subText}; }
    .sdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; transition: background 0.4s, box-shadow 0.4s; }
    .sdot.online { background: #10a37f; box-shadow: 0 0 6px #10a37f99; animation: spulse 2.5s ease-in-out infinite; }
    .sdot.offline { background: #ef4444; box-shadow: 0 0 6px #ef444488; animation: none; }
    @keyframes spulse { 0%,100%{box-shadow:0 0 3px #10a37f66} 50%{box-shadow:0 0 10px #10a37f} }
    .hint { text-align: center; font-size: 11px; color: ${t.hintText}; margin-top: 10px; letter-spacing: 0.02em; transition: color 0.3s; }
    .modal-overlay { position: fixed; inset: 0; background: ${t.modalOverlay}; display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(8px); animation: fadeO 0.2s both; }
    @keyframes fadeO{from{opacity:0}to{opacity:1}}
    .modal { background: ${t.modalBg}; border: 1px solid ${t.inputBorder}; border-radius: 20px; width: 300px; padding: 32px 24px 24px; position: relative; text-align: center; animation: slideU 0.25s cubic-bezier(.34,1.56,.64,1) both; box-shadow: 0 24px 60px rgba(0,0,0,0.4); transition: background 0.3s, width 0.2s ease; }
    .modal.wide { width: min(560px, 90vw); text-align: left; }
    .modal-tabs { display: flex; gap: 6px; margin: 16px 0 18px; border-bottom: 1px solid ${t.inputBorder}; }
    .modal-tab { flex: 1; padding: 8px 4px; background: none; border: none; border-bottom: 2px solid transparent; color: ${t.subText}; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
    .modal-tab.active { color: ${t.text}; border-bottom-color: #ab68ff; }
    .modal-tab:hover { color: ${t.text}; }
    @keyframes slideU{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    .modal-close { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 6px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: background 0.15s; }
    .modal-close:hover { background: ${t.inputBg}; }
    .modal-eagle { font-size: 40px; margin-bottom: 12px; display: block; }
    .modal-name { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: ${t.text}; margin-bottom: 4px; transition: color 0.3s; }
    .modal-label { font-size: 11px; color: ${t.subText}; margin-bottom: 20px; letter-spacing: 0.06em; }
    .modal-divider { height: 1px; background: ${t.inputBorder}; margin: 0 0 20px; }
    .modal-links { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
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

    /* Mode switcher: one compact toggle button; tapping it slides a
       horizontal strip of every mode up above the whole chat bar so people
       can compare and pick, instead of hunting through a stacked menu. */
    .mode-toggle-wrap { position: relative; flex-shrink: 0; }
    .mode-toggle-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid ${t.inputBorder}; background: ${t.modalBg}; color: ${t.text}; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px var(--glow), 0 0 10px var(--glow), 0 2px 8px rgba(0,0,0,0.2); transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease; animation: modeGlow 2.6s ease-in-out infinite; }
    .mode-toggle-btn:hover { transform: translateY(-2px); }
    .mode-toggle-btn:active { transform: translateY(0) scale(0.94); }
    .mode-toggle-btn.open { transform: scale(0.92); opacity: 0.85; }
    @keyframes modeGlow { 0%,100% { box-shadow: 0 0 0 3px var(--glow), 0 0 8px var(--glow), 0 2px 8px rgba(0,0,0,0.2); } 50% { box-shadow: 0 0 0 3px var(--glow), 0 0 16px var(--glow), 0 2px 8px rgba(0,0,0,0.2); } }
    .mode-row { position: absolute; left: 0; right: 0; bottom: calc(100% + 12px); display: flex; gap: 8px; overflow-x: auto; padding: 10px; background: ${t.modalBg}; border: 1px solid ${t.inputBorder}; border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.3); animation: modeRowIn 0.2s cubic-bezier(.2,.8,.3,1) both; z-index: 6; }
    .mode-row::-webkit-scrollbar { height: 4px; }
    .mode-row::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 3px; }
    @keyframes modeRowIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .mode-row-item { flex: 1 0 auto; min-width: 78px; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 10px; border-radius: 12px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.12s ease, box-shadow 0.2s ease; }
    .mode-row-item:hover { background: ${t.inputBg}; color: ${t.text}; transform: translateY(-2px); }
    .mode-row-item:active { transform: translateY(0) scale(0.96); }
    .mode-row-item.active { color: ${t.text}; border-color: transparent; box-shadow: 0 0 0 2px var(--glow), 0 0 14px var(--glow); }
    .mode-row-icon { font-size: 19px; line-height: 1; }
    .mode-row-label { font-size: 10.5px; font-weight: 500; white-space: nowrap; }

    .attach-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease; }
    .attach-btn:hover { background: ${t.inputBg}; color: ${t.text}; transform: translateY(-1px); }
    .attach-btn:active { transform: translateY(0) scale(0.94); }
    .file-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 2px 8px; }
    .file-chip { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 5px 8px 5px 10px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; color: ${t.text}; max-width: 220px; }
    .file-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-chip-thumb { width: 18px; height: 18px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
    .file-chip-remove { border: none; background: transparent; color: ${t.subText}; cursor: pointer; font-size: 13px; line-height: 1; padding: 0 2px; flex-shrink: 0; }
    .file-chip-remove:hover { color: ${t.text}; }
    .msg-file-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; justify-content: flex-end; }
    .msg-file-chip { font-size: 11px; padding: 4px 9px; border-radius: 7px; background: rgba(255,255,255,0.12); color: ${t.userText}; }

    @media (prefers-reduced-motion: reduce) {
      .shell, .msg-block, .welcome, .welcome-eagle, .brand-icon, .modal, .modal-overlay,
      .chip, .send-btn, .icon-btn, .dev-btn, .account-menu, .bot-avatar, .mode-toggle-btn, .mode-row, .mode-row-item { animation: none !important; transition: none !important; }
    }

    /* Tablet & phone: tighter chrome so the chat itself stays the focus */
    @media (max-width: 860px) {
      .topbar { padding: 10px 14px; }
      .conversation { padding: 20px 14px 12px; }
      .input-wrapper { padding: 8px 14px 16px; }
      .welcome-title { font-size: 24px; }
      .welcome-eagle { font-size: 42px; margin-bottom: 14px; }
      .user-pill { max-width: 85%; }
      .msg-block.bot { gap: 10px; }
      .dev-btn { padding: 0 12px; font-size: 11.5px; }
      .topbar-right { gap: 6px; }
      .modal { width: min(300px, 88vw); }
      .account-menu { width: min(220px, 80vw); }
    }

    /* Small phones: drop secondary chrome so nothing wraps or overflows */
    @media (max-width: 480px) {
      .topbar { padding: 8px 10px; }
      .brand-name { display: none; }
      .status-label { display: none; }
      .status-badge { padding: 0 8px; height: 28px; gap: 0; }
      .icon-btn, .avatar-btn { width: 30px; height: 30px; }
      .dev-btn { padding: 0 9px; }
      .conversation { padding: 16px 10px 8px; }
      .msg-block { padding: 14px 0; }
      .user-pill { max-width: 90%; padding: 10px 14px; font-size: 14px; }
      .bot-content, textarea { font-size: 14.5px; }
      .input-wrapper { padding: 8px 10px 14px; }
      .input-box { padding: 10px 10px 10px 14px; gap: 6px; }
      .mode-toggle-btn, .attach-btn, .send-btn { width: 32px; height: 32px; }
      .mode-row-item { min-width: 66px; padding: 8px 6px; }
      .mode-row-icon { font-size: 17px; }
      .mode-row-label { font-size: 10px; }
      .welcome-title { font-size: 21px; }
      .chip { padding: 8px 14px; font-size: 12.5px; }
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

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const RegenerateIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <polyline points="23 20 23 14 17 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const StopSquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="3"/>
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
  { id: "normal", label: "Normal Mode", icon: "😊", glow: "#f5b942" },
  { id: "education", label: "Education Mode", icon: "📘", glow: "#4f8cff" },
  { id: "love", label: "Love Mode", icon: "❤️", glow: "#ff4f81" },
  { id: "developer", label: "Developer Mode", icon: "💻", glow: "#22c55e" },
];

export default function App() {
  const [text, setText] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [devTab, setDevTab] = useState("profile");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [mode, setMode] = useState("normal");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [convLoading, setConvLoading] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth > 860 : true));
  // On phones the sidebar is an overlay, not a rail — closing it after picking
  // a chat (or starting a new one) keeps the conversation in view instead of
  // leaving the list covering the screen. No-op on wider layouts.
  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 860) setSidebarOpen(false);
  };
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const modeRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

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

  // Load the signed-in user's saved conversations for the sidebar. Doesn't
  // fire until session exists, and clears out again on sign-out below.
  useEffect(() => {
    if (!session) return;
    listConversations().then(setConversations).catch(() => {});
  }, [session]);

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

  const MAX_FILE_SIZE = 200 * 1024; // 200KB per text file — keeps requests within reasonable LLM token limits
  const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB per image

  const readFile = (file) => new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      if (file.size > MAX_IMAGE_SIZE) {
        resolve({ name: file.name, type: "image", error: `Image too large — ${(file.size / (1024 * 1024)).toFixed(1)}MB, limit is 4MB` });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: "image", dataUrl: reader.result });
      reader.onerror = () => resolve({ name: file.name, type: "image", error: "Could not read this image" });
      reader.readAsDataURL(file);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      resolve({ name: file.name, type: "text", content: `[File too large to include — ${(file.size / 1024).toFixed(0)}KB, limit is 200KB]` });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: "text", content: reader.result });
    reader.onerror = () => resolve({ name: file.name, type: "text", content: "[Could not read this file]" });
    reader.readAsText(file);
  });

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const results = await Promise.all(files.map(readFile));
    setAttachedFiles(prev => [...prev, ...results]);
    e.target.value = ""; // allow re-selecting the same file later
  };

  const removeFile = (idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));

  // Blank the working chat and detach from any saved conversation — the
  // next message sent will create a fresh row in `conversations`.
  const startNewChat = () => {
    setActiveConversationId(null);
    setChat([]);
    setText("");
    setAttachedFiles([]);
    setSpeakingIndex(null);
    window.speechSynthesis?.cancel();
  };

  // Pull a saved conversation's messages down from Supabase and swap them
  // into the working chat view.
  const openConversation = async (conv) => {
    if (loading) return;
    setActiveConversationId(conv.id);
    setMode(conv.mode || "normal");
    setSpeakingIndex(null);
    window.speechSynthesis?.cancel();
    setConvLoading(true);
    try {
      const msgs = await listMessages(conv.id);
      setChat(msgs.map(m => ({ type: m.type, text: m.text, files: m.files || [] })));
    } catch {
      setChat([]);
    } finally {
      setConvLoading(false);
    }
  };

  const handleToggleStar = async (conv) => {
    const next = !conv.starred;
    setConversations(prev => prev.map(c => (c.id === conv.id ? { ...c, starred: next } : c)));
    try {
      await toggleConversationStar(conv.id, next);
    } catch {
      setConversations(prev => prev.map(c => (c.id === conv.id ? { ...c, starred: !next } : c)));
    }
  };

  const handleDeleteConversation = async (conv) => {
    setConversations(prev => prev.filter(c => c.id !== conv.id));
    if (activeConversationId === conv.id) startNewChat();
    try {
      await deleteConversation(conv.id);
    } catch {
      // If the delete failed server-side, the next conversation list reload will restore it.
    }
  };

  // Shared network call so both a fresh send and a regenerate can reuse the
  // exact same request shape. Wires up an AbortController so the "stop"
  // button can cancel an in-flight generation.
  const requestReply = async (msg, images, textFiles) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let res;
    if (images.length > 0) {
      const filesNote = textFiles.length > 0
        ? `\n\nAlso attached (as text/code):\n` + textFiles.map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n")
        : "";
      res = await fetch("https://garud-ai.onrender.com/vision-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: msg + filesNote, images }),
        signal: controller.signal,
      });
    } else {
      res = await fetch("https://garud-ai.onrender.com/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: msg,
          mode,
          files: textFiles.map(f => ({ name: f.name, content: f.content })),
        }),
        signal: controller.signal,
      });
    }
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = await res.json();
    return data.reply ?? "Sorry, I didn't get a valid response.";
  };

  // Cancels whatever request is currently in flight (used by the stop
  // button that replaces the send button while a reply is generating).
  const stopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  const send = async (msgOverride) => {
    const msg = (msgOverride || text).trim();
    const filesToSend = attachedFiles;
    if (!msg && filesToSend.length === 0) return;
    if (loading) return;

    // Lazily create the saved conversation on first send, so browsing the
    // welcome screen never litters the sidebar with empty chats.
    let convId = activeConversationId;
    if (!convId) {
      try {
        const title = msg ? msg.slice(0, 60) : `Review: ${filesToSend[0]?.name || "files"}`;
        const conv = await createConversation(title, mode);
        convId = conv.id;
        setActiveConversationId(convId);
        setConversations(prev => [conv, ...prev]);
      } catch {
        // Persisting failed — fall through and keep the chat working in-memory only.
      }
    }

    const images = filesToSend.filter(f => f.type === "image" && f.dataUrl).map(f => f.dataUrl);
    const textFiles = filesToSend.filter(f => f.type !== "image").map(f => ({ name: f.name, content: f.content }));

    // Stash the raw request payload on the user bubble (not just filenames)
    // so a later "regenerate" on the following bot reply can replay the
    // exact same question, images, and files.
    setChat(p => [...p, { type: "user", text: msg, files: filesToSend.map(f => f.name), _images: images, _textFiles: textFiles }]);
    setText("");
    setAttachedFiles([]);
    setLoading(true);
    if (convId) saveMessage(convId, "user", msg, filesToSend.map(f => f.name)).catch(() => {});

    try {
      const replyText = await requestReply(msg, images, textFiles);
      setChat(p => [...p, { type: "bot", text: replyText }]);
      if (convId) {
        saveMessage(convId, "bot", replyText).catch(() => {});
        setConversations(prev => {
          const now = new Date().toISOString();
          const updated = prev.map(c => (c.id === convId ? { ...c, last_message_at: now } : c));
          return updated.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
        });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setChat(p => [...p, { type: "bot", text: "⏹ Generation stopped." }]);
      } else {
        setChat(p => [...p, { type: "bot", text: "Could not reach the server. Please try again." }]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Re-runs the request behind a bot reply (by its index in `chat`) and
  // swaps that reply in place, so an accidental send or a flaky response
  // can be redone without retyping the question or duplicating the thread.
  const regenerate = async (botIndex) => {
    if (loading) return;
    let uIdx = botIndex - 1;
    while (uIdx >= 0 && chat[uIdx].type !== "user") uIdx--;
    if (uIdx < 0) return;
    const userMsg = chat[uIdx];
    const convId = activeConversationId;

    setLoading(true);
    try {
      const replyText = await requestReply(userMsg.text, userMsg._images || [], userMsg._textFiles || []);
      setChat(p => {
        const next = [...p];
        next[botIndex] = { type: "bot", text: replyText };
        return next;
      });
      if (convId) saveMessage(convId, "bot", replyText).catch(() => {});
    } catch (err) {
      if (err.name !== "AbortError") {
        setChat(p => {
          const next = [...p];
          next[botIndex] = { type: "bot", text: "Could not reach the server. Please try again." };
          return next;
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const copyMessage = async (index, rawText) => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(i => (i === index ? null : i)), 1500);
    } catch {
      /* clipboard may be unavailable, fail silently */
    }
  };

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
  const hasText = text.trim().length > 0 || attachedFiles.length > 0;
  const handleSignOut = async () => {
    setShowAccount(false);
    window.speechSynthesis?.cancel();
    setSpeakingIndex(null);
    await supabase.auth.signOut();
    setChat([]);
    setConversations([]);
    setActiveConversationId(null);
    setShowStarredOnly(false);
  };
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
          <div className={`modal ${devTab === "code" ? "wide" : ""}`} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDev(false)}>✕</button>
            <span className="modal-eagle">🦅</span>
            <div className="modal-name">Ritesh Sharma</div>
            <div className="modal-label">Developer · Garuda AI</div>

            <div className="modal-tabs">
              <button className={`modal-tab ${devTab === "profile" ? "active" : ""}`} onClick={() => setDevTab("profile")} type="button">Profile</button>
              <button className={`modal-tab ${devTab === "code" ? "active" : ""}`} onClick={() => setDevTab("code")} type="button">Code Helper</button>
            </div>

            {devTab === "profile" ? (
              <>
                <div className="modal-links">
                  <a className="modal-insta" href="https://instagram.com/ritesh.jns" target="_blank" rel="noopener noreferrer">
                    <div className="insta-icon">
                      <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </div>
                    @ritesh.jns
                  </a>
                  <a className="modal-insta" href="https://github.com/ritesh8380/Garud_AI" target="_blank" rel="noopener noreferrer">
                    <div className="insta-icon" style={{ background: t.text, borderRadius: "50%" }}>
                      <svg viewBox="0 0 24 24" fill={t.bg}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.755-1.333-1.755-1.09-.744.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.42-1.305.763-1.605-2.665-.303-5.466-1.334-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.435.375.81 1.11.81 2.235 0 1.615-.015 2.915-.015 3.31 0 .32.21.695.825.575C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                    </div>
                    View source
                  </a>
                </div>
                <div className="modal-built">Built with 🦅 and precision</div>
              </>
            ) : (
              <DevCodeHelper t={t} />
            )}
          </div>
        </div>
      )}

      <div className="app-layout">
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <Sidebar
          t={t}
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={(c) => { openConversation(c); closeSidebarOnMobile(); }}
          onNew={() => { startNewChat(); closeSidebarOnMobile(); }}
          onToggleStar={handleToggleStar}
          onDelete={handleDeleteConversation}
          showStarredOnly={showStarredOnly}
          onToggleStarredFilter={() => setShowStarredOnly(v => !v)}
          open={sidebarOpen}
        />
        <div className="shell">
        <div className="topbar">
          <div className="brand">
            <button className="icon-btn sidebar-toggle-btn" onClick={() => setSidebarOpen(v => !v)} title="Toggle sidebar" type="button">☰</button>
            <span className="brand-icon">🦅</span>
            <span className="brand-name">Garuda AI</span>
          </div>
          <div className="topbar-right">
            <div className="status-badge">
              <span className={`sdot ${isOnline ? "online" : "offline"}`} />
              <span className="status-label">{isOnline ? "online" : "offline"}</span>
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
          {convLoading && (
            <div className="welcome">
              <span className="welcome-eagle">🦅</span>
              <div className="welcome-sub">Loading conversation…</div>
            </div>
          )}
          {!convLoading && chat.length === 0 && (
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
                <div className="user-pill">
                  {m.text}
                  {m.files?.length > 0 && (
                    <div className="msg-file-chips">
                      {m.files.map((fn, fi) => <span key={fi} className="msg-file-chip">📄 {fn}</span>)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bot-avatar">🦅</div>
                  <div className="bot-wrap">
                    <div className="bot-content"><FormattedMessage text={m.text} /></div>
                    <div className="msg-actions">
                      <button
                        className={`speak-btn ${speakingIndex === i ? "speaking" : ""}`}
                        onClick={() => toggleSpeak(i, m.text)}
                        title={speakingIndex === i ? "Stop reading" : "Read aloud"}
                        type="button"
                      >
                        {speakingIndex === i ? <StopIcon /> : <SpeakerIcon />}
                      </button>
                      <button
                        className={`speak-btn ${copiedIndex === i ? "speaking" : ""}`}
                        onClick={() => copyMessage(i, m.text)}
                        title={copiedIndex === i ? "Copied" : "Copy reply"}
                        type="button"
                      >
                        {copiedIndex === i ? <CheckIcon /> : <CopyIcon />}
                      </button>
                      <button
                        className="speak-btn"
                        onClick={() => regenerate(i)}
                        title="Regenerate reply"
                        type="button"
                        disabled={loading}
                      >
                        <RegenerateIcon />
                      </button>
                    </div>
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
          {attachedFiles.length > 0 && (
            <div className="file-chips">
              {attachedFiles.map((f, i) => (
                <div key={i} className="file-chip">
                  {f.type === "image" && f.dataUrl ? (
                    <img src={f.dataUrl} alt="" className="file-chip-thumb" />
                  ) : (
                    <span>{f.type === "image" ? "⚠️" : "📄"}</span>
                  )}
                  <span className="file-chip-name">{f.error || f.name}</span>
                  <button type="button" className="file-chip-remove" onClick={() => removeFile(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="input-box" ref={modeRef}>
            {modeMenuOpen && (
              <div className="mode-row">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`mode-row-item ${mode === m.id ? "active" : ""}`}
                    style={{ "--glow": m.glow }}
                    onClick={() => { setMode(m.id); setModeMenuOpen(false); }}
                  >
                    <span className="mode-row-icon">{m.icon}</span>
                    <span className="mode-row-label">{m.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mode-toggle-wrap">
              <button
                type="button"
                className={`mode-toggle-btn ${modeMenuOpen ? "open" : ""}`}
                style={{ "--glow": (MODES.find(m => m.id === mode) || MODES[0]).glow }}
                onClick={() => setModeMenuOpen(v => !v)}
                title={`Mode: ${(MODES.find(m => m.id === mode) || MODES[0]).label} — tap to switch`}
              >
                {(MODES.find(m => m.id === mode) || MODES[0]).icon}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.java,.c,.cpp,.go,.rb,.php,.sql,.yaml,.yml,.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.csv,.xlsx"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="attach-btn"
              title="Attach files"
              onClick={() => fileInputRef.current?.click()}
            >
              📎
            </button>
            <textarea
              ref={textareaRef} rows={1} value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder={mode === "developer" ? "Paste code or attach files to review…" : "Message Garuda AI"}
              disabled={loading} autoFocus
            />
            <button
              className={`send-btn ${loading ? "stop-mode" : ""}`}
              onClick={() => (loading ? stopGenerating() : send())}
              disabled={!loading && !hasText}
              title={loading ? "Stop generating" : "Send"}
            >
              {loading ? <StopSquareIcon /> : <SendIcon />}
            </button>
          </div>
          <div className="hint">Garuda AI · garud-ai.onrender.com · Shift+Enter for new line</div>
        </div>
        </div>
      </div>
    </>
  );
}