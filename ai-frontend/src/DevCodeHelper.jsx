import { useState, useRef } from "react";
import FormattedMessage from "./FormattedMessage";

// Only these count as "code" worth loading — keeps things away from
// images, locks, and node_modules noise.
const CODE_EXTENSIONS = [
  "js", "jsx", "ts", "tsx", "py", "java", "go", "rb", "php", "c", "cpp", "h",
  "cs", "html", "css", "scss", "json", "md", "sql", "sh", "yml", "yaml",
  "vue", "svelte", "rs", "kt", "swift",
];
const SKIP_PATH_PARTS = ["node_modules", "dist", "build", ".git", "vendor", "package-lock.json", "yarn.lock"];
const MAX_FILE_CHARS = 10000;      // cap per file
const MAX_TOTAL_CHARS = 40000;     // cap across all selected files combined
const MAX_AUTO_FILES = 20;         // don't auto-load more than this many files

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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // path -> content
  const [pendingPath, setPendingPath] = useState(""); // path currently being fetched
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [autoLoadStatus, setAutoLoadStatus] = useState("");
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [asking, setAsking] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const imageInputRef = useRef(null);

  const totalChars = Object.values(selected).reduce((sum, c) => sum + c.length, 0);
  const selectedCount = Object.keys(selected).length;

  const fetchFileContent = async (path) => {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
    if (!res.ok) throw new Error("fetch failed");
    const text = await res.text();
    return text.slice(0, MAX_FILE_CHARS);
  };

  const loadRepo = async () => {
    setError(""); setFiles([]); setSelected({}); setThread([]); setAutoLoadStatus("");
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
        if (codeFiles.length === 0) { setError("Found the repo, but no recognizable source files in it."); return; }
        await autoLoad(parsed.owner, parsed.repo, b, codeFiles);
        return;
      } catch {
        /* try next branch */
      }
    }
    setLoadingRepo(false);
    setError("Couldn't read that repo — check it's public, and the URL is correct.");
  };

  // Pulls in files up to MAX_AUTO_FILES / MAX_TOTAL_CHARS right after load,
  // so there's a working set of context immediately instead of an empty list.
  const autoLoad = async (o, r, b, codeFiles) => {
    const picked = {};
    let running = 0;
    for (const f of codeFiles) {
      if (Object.keys(picked).length >= MAX_AUTO_FILES) break;
      setAutoLoadStatus(`Loading ${f.path}…`);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${o}/${r}/${b}/${f.path}`);
        if (!res.ok) continue;
        const text = (await res.text()).slice(0, MAX_FILE_CHARS);
        if (running + text.length > MAX_TOTAL_CHARS) continue; // skip, keep trying smaller files
        picked[f.path] = text;
        running += text.length;
      } catch {
        /* skip unreadable file */
      }
    }
    setSelected(picked);
    setAutoLoadStatus("");
  };

  const toggleFile = async (path) => {
    if (selected[path] !== undefined) {
      const next = { ...selected };
      delete next[path];
      setSelected(next);
      return;
    }
    setPendingPath(path);
    setError("");
    try {
      const content = await fetchFileContent(path);
      if (totalChars + content.length > MAX_TOTAL_CHARS) {
        setError(`Adding ${path} would go over the ${MAX_TOTAL_CHARS.toLocaleString()}-char context budget — deselect something first.`);
        return;
      }
      setSelected(prev => ({ ...prev, [path]: content }));
    } catch {
      setError(`Couldn't fetch ${path}.`);
    } finally {
      setPendingPath("");
    }
  };

  const clearSelection = () => setSelected({});

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
    if (!attachedImage && selectedCount === 0) return;

    setThread(p => [...p, { role: "user", text: q || "(sent an image)", image: attachedImage?.dataUrl }]);
    setQuestion("");
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setAsking(true);

    try {
      let res;
      if (imageToSend) {
        const contextNote = selectedCount > 0 ? `This relates to the repo ${owner}/${repo} (${selectedCount} files loaded as context). ` : "";
        res = await fetch("https://garud-ai.onrender.com/vision-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: contextNote + q, image: imageToSend.dataUrl }),
        });
      } else {
        const fileList = Object.keys(selected).join("\n");
        const context = Object.entries(selected).map(([path, content]) => `--- ${path} ---\n${content}`).join("\n\n");
        const prompt =
          `You are helping a developer understand and fix bugs across real code from a GitHub repository.\n` +
          `Repo: ${owner}/${repo}\nFiles loaded as context (${selectedCount}):\n${fileList}\n\n` +
          `--- FILE CONTENTS START ---\n${context}\n--- FILE CONTENTS END ---\n\n` +
          `Question: ${q}\n\n` +
          `Reference specific files by name in your answer. If there's a fix, show exactly what to change and in which file.`;
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

  const filteredFiles = search.trim()
    ? files.filter(f => f.path.toLowerCase().includes(search.trim().toLowerCase()))
    : files;

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
        .dch-btn-ghost { height: 30px; padding: 0 12px; border-radius: 7px; border: 1px solid ${t.inputBorder}; background: transparent; color: ${t.subText}; font-family: 'Inter', sans-serif; font-size: 12px; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .dch-btn-ghost:hover { background: ${t.inputBg}; color: ${t.text}; }
        .dch-hint { font-size: 11px; color: ${t.subText}; margin-bottom: 10px; line-height: 1.5; }
        .dch-error { font-size: 12px; color: #ef4444; margin-bottom: 10px; }
        .dch-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .dch-chip { display: inline-block; font-size: 11px; color: ${t.subText}; background: ${t.inputBg}; border: 1px solid ${t.inputBorder}; padding: 4px 9px; border-radius: 999px; }
        .dch-budget-bar { height: 4px; border-radius: 2px; background: ${t.inputBorder}; margin-bottom: 10px; overflow: hidden; }
        .dch-budget-fill { height: 100%; background: linear-gradient(90deg,#ab68ff,#8b3cff); transition: width 0.2s ease; }
        .dch-filelist { max-height: 170px; overflow-y: auto; border: 1px solid ${t.inputBorder}; border-radius: 8px; margin-bottom: 10px; }
        .dch-file-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 12px; color: ${t.text}; border-bottom: 1px solid ${t.inputBorder}; cursor: pointer; }
        .dch-file-row:last-child { border-bottom: none; }
        .dch-file-row:hover { background: ${t.inputBg}; }
        .dch-file-row input { flex-shrink: 0; }
        .dch-file-path { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dch-file-spinner { width: 11px; height: 11px; border-radius: 50%; border: 2px solid ${t.inputBorder}; border-top-color: #ab68ff; animation: dchspin 0.7s linear infinite; flex-shrink: 0; }
        @keyframes dchspin { to { transform: rotate(360deg); } }
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
      <div className="dch-hint">
        Public repos only — this pulls file content through GitHub's API and holds it as context (up to {MAX_AUTO_FILES} files / {MAX_TOTAL_CHARS.toLocaleString()} chars). It's not a real git clone — no history, no binaries — just enough to ask questions across the codebase.
      </div>

      {autoLoadStatus && <div className="dch-hint">{autoLoadStatus}</div>}
      {error && <div className="dch-error">{error}</div>}

      {files.length > 0 && (
        <>
          <div className="dch-summary">
            <span className="dch-chip">{selectedCount} file{selectedCount === 1 ? "" : "s"} · {totalChars.toLocaleString()}/{MAX_TOTAL_CHARS.toLocaleString()} chars</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="dch-btn-ghost" type="button" onClick={clearSelection} disabled={selectedCount === 0}>Clear</button>
            </div>
          </div>
          <div className="dch-budget-bar">
            <div className="dch-budget-fill" style={{ width: `${Math.min(100, (totalChars / MAX_TOTAL_CHARS) * 100)}%` }} />
          </div>

          <input
            className="dch-input"
            style={{ marginBottom: 8, width: "100%" }}
            placeholder="Filter files…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="dch-filelist">
            {filteredFiles.map(f => (
              <label key={f.path} className="dch-file-row">
                {pendingPath === f.path ? (
                  <span className="dch-file-spinner" />
                ) : (
                  <input type="checkbox" checked={selected[f.path] !== undefined} onChange={() => toggleFile(f.path)} />
                )}
                <span className="dch-file-path">{f.path}</span>
              </label>
            ))}
            {filteredFiles.length === 0 && <div className="dch-empty">No files match "{search}".</div>}
          </div>
        </>
      )}

      <div className="dch-thread">
        {thread.length === 0 && (
          <div className="dch-empty">
            {selectedCount > 0 ? "Ask anything across the loaded files, or attach a screenshot below." : "Load a repo, or attach a screenshot — an error, a broken UI, a stack trace — and ask about it."}
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
          placeholder={selectedCount > 0 ? "How does auth work across these files?" : "What's wrong in this screenshot?"}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          disabled={asking}
        />
        <button className="dch-btn" onClick={ask} disabled={asking || (!question.trim() && !attachedImage) || (!attachedImage && selectedCount === 0)}>
          Ask
        </button>
      </div>
    </div>
  );
}