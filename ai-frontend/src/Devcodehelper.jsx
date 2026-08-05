import { useState } from "react";
import FormattedMessage from "./FormattedMessage";

// Only these count as "code" worth loading into the picker — keeps the
// dropdown from filling up with images, locks files, and node_modules noise.
const CODE_EXTENSIONS = [
  "js", "jsx", "ts", "tsx", "py", "java", "go", "rb", "php", "c", "cpp", "h",
  "cs", "html", "css", "scss", "json", "md", "sql", "sh", "yml", "yaml",
  "vue", "svelte", "rs", "kt", "swift",
];
const SKIP_PATH_PARTS = ["node_modules", "dist", "build", ".git", "vendor", "package-lock.json", "yarn.lock"];
const MAX_FILE_CHARS = 10000;

function parseRepoUrl(url) {
  const m = url.trim().match(/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export default function DevCodeHelper({ t }) {
  const [url, setUrl] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [asking, setAsking] = useState(false);

  const loadRepo = async () => {
    setError(""); setFiles([]); setSelectedFile(""); setFileContent(""); setThread([]);
    const parsed = parseRepoUrl(url);
    if (!parsed) { setError("That doesn't look like a github.com repo URL."); return; }
    setLoadingRepo(true);
    setOwner(parsed.owner); setRepo(parsed.repo);

    for (const b of ["main", "master"]) {
      try {
        const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${b}?recursive=1`);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.tree) continue;
        const codeFiles = data.tree
          .filter(f => f.type === "blob")
          .filter(f => !SKIP_PATH_PARTS.some(skip => f.path.includes(skip)))
          .filter(f => CODE_EXTENSIONS.includes((f.path.split(".").pop() || "").toLowerCase()))
          .slice(0, 300);
        setBranch(b);
        setFiles(codeFiles);
        setLoadingRepo(false);
        if (codeFiles.length === 0) setError("Found the repo, but no recognizable source files in it.");
        return;
      } catch {
        /* try next branch */
      }
    }
    setLoadingRepo(false);
    setError("Couldn't read that repo — check it's public, and the URL is correct.");
  };

  const selectFile = async (path) => {
    setSelectedFile(path);
    setFileContent(""); setThread([]); setError(""); setTruncated(false);
    if (!path) return;
    setLoadingFile(true);
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
      if (!res.ok) throw new Error();
      const text = await res.text();
      setTruncated(text.length > MAX_FILE_CHARS);
      setFileContent(text.slice(0, MAX_FILE_CHARS));
    } catch {
      setError("Couldn't fetch that file's content.");
    } finally {
      setLoadingFile(false);
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || asking || !selectedFile) return;
    setThread(p => [...p, { role: "user", text: q }]);
    setQuestion("");
    setAsking(true);
    try {
      const prompt =
        `You are helping a developer understand and fix a bug in real code from a GitHub repository.\n` +
        `Repo: ${owner}/${repo}\nFile: ${selectedFile}${truncated ? " (truncated to first " + MAX_FILE_CHARS + " chars)" : ""}\n\n` +
        `--- FILE CONTENT START ---\n${fileContent}\n--- FILE CONTENT END ---\n\n` +
        `Question: ${q}\n\n` +
        `Explain clearly and, if there's a fix, show exactly what to change.`;
      const res = await fetch("https://garud-ai.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      setThread(p => [...p, { role: "bot", text: data.reply }]);
    } catch {
      setThread(p => [...p, { role: "bot", text: "Could not reach the server. Please try again." }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="dch">
      <style>{`
        .dch { text-align: left; width: 100%; }
        .dch-row { display: flex; gap: 8px; margin-bottom: 8px; }
        .dch-input { flex: 1; height: 38px; padding: 0 12px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 13px; outline: none; }
        .dch-input:focus { border-color: #ab68ff; }
        .dch-btn { height: 38px; padding: 0 16px; border-radius: 8px; border: none; background: linear-gradient(90deg,#ab68ff,#8b3cff); color: #fff; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; transition: opacity 0.15s; }
        .dch-btn:hover:not(:disabled) { opacity: 0.88; }
        .dch-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dch-select { width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 13px; margin-bottom: 8px; }
        .dch-hint { font-size: 11px; color: ${t.subText}; margin-bottom: 12px; line-height: 1.5; }
        .dch-error { font-size: 12px; color: #ef4444; margin-bottom: 10px; }
        .dch-chip { display: inline-block; font-size: 11px; color: ${t.subText}; background: ${t.inputBg}; border: 1px solid ${t.inputBorder}; padding: 4px 9px; border-radius: 999px; margin-bottom: 10px; }
        .dch-thread { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; padding-right: 2px; }
        .dch-msg.user { align-self: flex-end; background: ${t.userPillBg}; border: 1px solid ${t.userPillBorder}; border-radius: 12px; padding: 8px 12px; font-size: 13px; color: ${t.userText}; max-width: 85%; }
        .dch-msg.bot { font-size: 13px; color: ${t.assistantText}; line-height: 1.6; }
        .dch-ask-row { display: flex; gap: 8px; }
        .dch-ask-row .dch-input { font-size: 13px; }
        .dch-empty { font-size: 12px; color: ${t.subText}; text-align: center; padding: 16px 0; }
      `}</style>

      <div className="dch-row">
        <input
          className="dch-input"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && loadRepo()}
        />
        <button className="dch-btn" onClick={loadRepo} disabled={loadingRepo}>
          {loadingRepo ? "Loading…" : "Load"}
        </button>
      </div>
      <div className="dch-hint">Public repos only — this reads files through GitHub's public API, no login needed.</div>

      {error && <div className="dch-error">{error}</div>}

      {files.length > 0 && (
        <>
          <select className="dch-select" value={selectedFile} onChange={e => selectFile(e.target.value)}>
            <option value="">Select a file to ask about…</option>
            {files.map(f => <option key={f.path} value={f.path}>{f.path}</option>)}
          </select>

          {loadingFile && <div className="dch-hint">Fetching file…</div>}

          {selectedFile && !loadingFile && fileContent && (
            <>
              <div className="dch-chip">{selectedFile} · {fileContent.length}{truncated ? "+" : ""} chars{truncated ? " (truncated)" : ""}</div>

              <div className="dch-thread">
                {thread.length === 0 && <div className="dch-empty">Ask anything about this file — a bug, what a function does, how to fix an error.</div>}
                {thread.map((m, i) => (
                  <div key={i} className={`dch-msg ${m.role}`}>
                    {m.role === "user" ? m.text : <FormattedMessage text={m.text} />}
                  </div>
                ))}
                {asking && <div className="dch-msg bot">Thinking…</div>}
              </div>

              <div className="dch-ask-row">
                <input
                  className="dch-input"
                  placeholder="Why does this throw an error on line 12?"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && ask()}
                  disabled={asking}
                />
                <button className="dch-btn" onClick={ask} disabled={asking || !question.trim()}>Ask</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}