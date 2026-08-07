import { useState } from "react";

// Small, dependency-free markdown renderer tuned for chat replies.
// Handles: fenced code blocks, inline code, bold, italic, links,
// headers, and ordered/unordered lists. Not a full CommonMark parser —
// just enough to make AI replies readable instead of one dense paragraph.

// Rough, language-agnostic keyword set spanning C-like/Python/JS/Go/Rust —
// not a real parser, just enough overlap to color the common cases across
// whatever language shows up in a code block.
const KEYWORDS = [
  "if", "else", "elif", "for", "while", "do", "switch", "case", "break", "continue",
  "return", "function", "class", "struct", "enum", "public", "private", "protected",
  "static", "const", "let", "var", "new", "delete", "try", "catch", "finally", "throw",
  "import", "export", "from", "default", "extends", "implements", "interface", "void",
  "true", "false", "null", "undefined", "None", "True", "False", "and", "or", "not",
  "in", "is", "def", "except", "with", "as", "lambda", "yield", "async", "await",
  "this", "self", "super", "typeof", "instanceof", "namespace", "using", "template",
  "typename", "virtual", "override", "auto", "int", "float", "double", "char", "bool",
  "string", "std", "package", "fn", "impl", "match", "pub", "mut", "mod", "use", "trait",
  "type", "abstract", "final", "synchronized", "throws", "go", "func", "defer", "chan", "select",
];

// One combined regex, tried left-to-right: preprocessor directives, then
// comments, strings, numbers, keywords, then bare function calls (an
// identifier immediately followed by "("). Everything else passes through
// as plain text. Not a real tokenizer — just enough to look like an IDE.
const TOKEN_RE = new RegExp(
  [
    `(?<pre>#\\w+)`,
    `(?<comment>\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)`,
    `(?<string>"""[\\s\\S]*?"""|'''[\\s\\S]*?'''|"(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|` + "`(?:\\\\.|[^`\\\\])*`)",
    `(?<number>\\b\\d+\\.?\\d*\\b)`,
    `(?<keyword>\\b(?:${KEYWORDS.join("|")})\\b)`,
    `(?<func>\\b[A-Za-z_]\\w*(?=\\())`,
  ].join("|"),
  "g"
);

function highlightCode(code) {
  const nodes = [];
  let last = 0;
  let key = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(code)) !== null) {
    if (m.index > last) nodes.push(code.slice(last, m.index));
    const g = m.groups;
    let cls = "";
    if (g.pre) cls = "tok-pre";
    else if (g.comment) cls = "tok-comment";
    else if (g.string) cls = "tok-string";
    else if (g.number) cls = "tok-number";
    else if (g.keyword) cls = "tok-keyword";
    else if (g.func) cls = "tok-func";
    nodes.push(<span key={key++} className={cls}>{m[0]}</span>);
    last = TOKEN_RE.lastIndex;
    if (m.index === TOKEN_RE.lastIndex) TOKEN_RE.lastIndex++; // guard against zero-width matches
  }
  if (last < code.length) nodes.push(code.slice(last));
  return nodes;
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable, fail silently */
    }
  };

  return (
    <div className="md-code-block">
      <div className="md-code-head">
        <span>{lang || "text"}</span>
        <button className="md-copy-btn" onClick={copy} type="button">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{highlightCode(code)}</code>
      </pre>
    </div>
  );
}

// Parses **bold**, *italic*/_italic_, `code`, and [text](url) within a line.
function renderInline(text, keyPrefix) {
  const nodes = [];
  const pattern = /(\*\*.+?\*\*|`.+?`|\[.+?\]\(.+?\)|_[^_]+_|\*[^*]+\*)/g;
  let last = 0;
  let match;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key} className="md-strong">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} className="md-inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const m = token.match(/\[(.+?)\]\((.+?)\)/);
      nodes.push(
        <a key={key} className="md-link" href={m[2]} target="_blank" rel="noopener noreferrer">
          {m[1]}
        </a>
      );
    } else {
      const inner = token.slice(1, -1);
      nodes.push(<em key={key} className="md-em">{inner}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function FormattedMessage({ text }) {
  if (!text) return null;

  // Split out fenced code blocks first so their contents are never touched
  // by inline/list/header parsing.
  const segments = [];
  const fenceRe = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    if (m.index > lastIndex) segments.push({ type: "text", value: text.slice(lastIndex, m.index) });
    segments.push({ type: "code", lang: m[1], value: m[2].replace(/\n$/, "") });
    lastIndex = fenceRe.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ type: "text", value: text.slice(lastIndex) });

  const blocks = [];
  let listBuffer = null; // { ordered: bool, items: [] }

  const flushList = (key) => {
    if (!listBuffer) return;
    const Tag = listBuffer.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={key} className={listBuffer.ordered ? "md-ol" : "md-ul"}>
        {listBuffer.items.map((item, idx) => (
          <li key={idx}>{renderInline(item, `${key}-li-${idx}`)}</li>
        ))}
      </Tag>
    );
    listBuffer = null;
  };

  segments.forEach((seg, segIdx) => {
    if (seg.type === "code") {
      flushList(`list-${segIdx}`);
      blocks.push(<CodeBlock key={`code-${segIdx}`} lang={seg.lang} code={seg.value} />);
      return;
    }

    const lines = seg.value.split("\n");
    let para = [];

    const flushPara = (idx) => {
      if (para.length === 0) return;
      const joined = para.join(" ").trim();
      if (joined) {
        blocks.push(
          <p key={`p-${segIdx}-${idx}`} className="md-p">
            {renderInline(joined, `p-${segIdx}-${idx}`)}
          </p>
        );
      }
      para = [];
    };

    lines.forEach((line, lineIdx) => {
      const key = `${segIdx}-${lineIdx}`;
      const heading = line.match(/^(#{1,3})\s+(.*)/);
      const ulItem = line.match(/^\s*[-*]\s+(.*)/);
      const olItem = line.match(/^\s*\d+\.\s+(.*)/);

      if (heading) {
        flushPara(key);
        flushList(`list-${key}`);
        const level = heading[1].length;
        const visualLevel = level + 2 > 6 ? 6 : level + 2; // h1/h2/h3 md -> h3/h4/h5 visually
        const HTag = `h${visualLevel}`;
        blocks.push(
          <HTag key={`h-${key}`} className={`md-h md-h${visualLevel}`}>
            {renderInline(heading[2], `h-${key}`)}
          </HTag>
        );
      } else if (ulItem) {
        flushPara(key);
        if (!listBuffer || listBuffer.ordered) flushList(`list-${key}`);
        if (!listBuffer) listBuffer = { ordered: false, items: [] };
        listBuffer.items.push(ulItem[1]);
      } else if (olItem) {
        flushPara(key);
        if (!listBuffer || !listBuffer.ordered) flushList(`list-${key}`);
        if (!listBuffer) listBuffer = { ordered: true, items: [] };
        listBuffer.items.push(olItem[1]);
      } else if (line.trim() === "") {
        flushPara(key);
        flushList(`list-${key}`);
      } else {
        para.push(line);
      }
    });
    flushPara(`end-${segIdx}`);
    flushList(`list-end-${segIdx}`);
  });

  return <div className="md-body">{blocks}</div>;
}