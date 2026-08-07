import { useState, useRef } from "react";
import FormattedMessage from "./FormattedMessage";

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
  const [attachedImage, setAttachedImage] = useState(null);
  const imageInputRef = useRef(null);

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
      } catch {}
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

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please pick an image file."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Image is too large — please use one under 4MB."); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setAttachedImage({ dataUrl: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };

  const ask = async () => {
    const q = question.trim();
    if ((!q && !attachedImage) || asking) return;
    if (!attachedImage && !selectedFile) return;

    setThread(p => [...p, { role: "user", text: q || "(sent an image)", image: attachedImage?.dataUrl }]);
    setQuestion("");
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setAsking(true);

    try {
      let res;
      if (imageToSend) {
        const contextNote = selectedFile
          ? `This relates to the file ${selectedFile} from ${owner}/${repo}, currently open in the code helper. `
          : "";
        res = await fetch("https://garud-ai.onrender.com/vision-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: contextNote + q, image: imageToSend.dataUrl }),
        });
      } else {
        const prompt =
          `You are helping a developer understand and fix a bug in real code from a GitHub repository.\n` +
          `Repo: ${owner}/${repo}\nFile: ${selectedFile}${truncated ? " (truncated to first " + MAX_FILE_CHARS + " chars)" : ""}\n\n` +
          `--- FILE CONTENT START ---\n${fileContent}\n--- FILE CONTENT END ---\n\n` +
          `Question: ${q}\n\n` +
          `Explain clearly and, if there's a fix, show exactly what to change.`;
        res = await fetch("https://garud-ai.onrender.com/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
        });
      }
      const data = await res.json();
      setThread(p => [...p, { role: "bot", text: data.reply || data.error || "No response." }]);
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
        .dch-msg img { max-width: 100%; border-radius: 8px; margin-top: 6px; display: block; }
        .dch-ask-row { display: flex; gap: 8px; align-items: flex-end; }
        .dch-ask-row .dch-input { font-size: 13px; }
        .dch-empty { font-size: 12px; color: ${t.subText}; text-align: center; padding: 16px 0; }
        .dch-img-btn { width: 38px; height: 38px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; color: ${t.subText}; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; transition: color 0.15s, border-color 0.15s; }
        .dch-img-btn:hover { color: ${t.text}; border-color: #ab68ff; }
        .dch-img-preview { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px 8px; border-radius: 8px; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; }
        .dch-img-preview img { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; }
        .dch-img-preview span { font-size: 11px; color: ${t.subText}; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dch-img-remove { background: none; border: none; color: ${t.subText}; cursor: pointer; font-size: 14px; padding: 2px 6px; }
        .dch-img-remove:hover { color: #ef4444; }
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
      <div className="dch-hint">Public repos only, for code questions — or skip this and just attach a screenshot below.</div>

      {error && <div className="dch-error">{error}</div>}

      {files.length > 0 && (
        <>
          <select className="dch-select" value={selectedFile} onChange={e => selectFile(e.target.value)}>
            <option value="">Select a file to ask about…</option>
            {files.map(f => <option key={f.path} value={f.path}>{f.path}</option>)}
          </select>
          {loadingFile && <div className="dch-hint">Fetching file…</div>}
          {selectedFile && !loadingFile && fileContent && (
            <div className="dch-chip">{selectedFile} · {fileContent.length}{truncated ? "+" : ""} chars{truncated ? " (truncated)" : ""}</div>
          )}
        </>
      )}

      <div className="dch-thread">
        {thread.length === 0 && (
          <div className="dch-empty">
            {selectedFile ? "Ask anything about this file, or attach a screenshot below." : "Attach a screenshot — an error, a broken UI, a stack trace — and ask about it."}
          </div>
        )}
        {thread.map((m, i) => (
          <div key={i} className={`dch-msg ${m.role}`}>
            {m.role === "user" ? (
              <>
                {m.text}
                {m.image && <img src={m.image} alt="attached" />}
              </>
            ) : <FormattedMessage text={m.text} />}
          </div>
        ))}
        {asking && <div className="dch-msg bot">Thinking…</div>}
      </div>

      {attachedImage && (
        <div className="dch-img-preview">
          <img src={attachedImage.dataUrl} alt="preview" />
          <span>{attachedImage.name}</span>
          <button className="dch-img-remove" onClick={() => setAttachedImage(null)} type="button">✕</button>
        </div>
      )}

      <div className="dch-ask-row">
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImagePick} style={{ display: "none" }} />
        <button className="dch-img-btn" onClick={() => imageInputRef.current?.click()} title="Attach a screenshot" type="button">🖼️</button>
        <input
          className="dch-input"
          placeholder={selectedFile ? "Why does this throw an error on line 12?" : "What's wrong in this screenshot?"}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          disabled={asking}
        />
        <button className="dch-btn" onClick={ask} disabled={asking || (!question.trim() && !attachedImage) || (!attachedImage && !selectedFile)}>
          Ask
        </button>
      </div>
    </div>
  );
}