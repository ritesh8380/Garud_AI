import { useState } from "react";

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
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
        <code>{code}</code>
      </pre>
    </div>
  );
}

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
  let listBuffer = null;

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
        const visualLevel = level + 2 > 6 ? 6 : level + 2;
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