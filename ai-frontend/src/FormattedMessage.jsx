import { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

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

function renderMath(expr, displayMode) {
  try {
    return katex.renderToString(expr, {
      throwOnError: false,
      displayMode,
      strict: false,
    });
  } catch {
    return expr;
  }
}

function MathBlock({ expr }) {
  return (
    <div className="md-math-block">
      <span dangerouslySetInnerHTML={{ __html: renderMath(expr, true) }} />
    </div>
  );
}

// Order matters: bold before italic, `$...$` requires no space right after the
// opening `$` or right before the closing `$` so prices like "$5 and $10"
// don't get mistaken for math.
const INLINE_PATTERN =
  /(\*\*.+?\*\*|~~.+?~~|`[^`]+?`|\\\(.+?\\\)|\$(?!\s)[^$\n]+?(?<!\s)\$|\[.+?\]\(.+?\)|_[^_]+_|\*[^*]+\*)/g;

function renderInline(text, keyPrefix) {
  const nodes = [];
  const pattern = new RegExp(INLINE_PATTERN);
  let last = 0;
  let match;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key} className="md-strong">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key} className="md-del">{token.slice(2, -2)}</del>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} className="md-inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("\\(")) {
      nodes.push(
        <span
          key={key}
          className="md-math-inline"
          dangerouslySetInnerHTML={{ __html: renderMath(token.slice(2, -2), false) }}
        />
      );
    } else if (token.startsWith("$")) {
      nodes.push(
        <span
          key={key}
          className="md-math-inline"
          dangerouslySetInnerHTML={{ __html: renderMath(token.slice(1, -1), false) }}
        />
      );
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

function isTableSeparator(line) {
  return (
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) &&
    line.includes("-")
  );
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function TableBlock({ header, rows, keyBase }) {
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={`${keyBase}-h-${i}`}>{renderInline(h, `${keyBase}-h-${i}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={`${keyBase}-r-${ri}`}>
              {row.map((c, ci) => (
                <td key={`${keyBase}-r-${ri}-c-${ci}`}>{renderInline(c, `${keyBase}-r-${ri}-c-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FormattedMessage({ text }) {
  if (!text) return null;

  // 1. Pull fenced code blocks and block-math ($$...$$ or \[...\]) out first so
  // the line-based parser below never has to look inside them.
  const segments = [];
  const blockRe = /```(\w*)\n?([\s\S]*?)```|\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
  let lastIndex = 0;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    if (m.index > lastIndex) segments.push({ type: "text", value: text.slice(lastIndex, m.index) });
    if (m[1] !== undefined || m[2] !== undefined) {
      segments.push({ type: "code", lang: m[1], value: (m[2] || "").replace(/\n$/, "") });
    } else {
      const expr = (m[3] !== undefined ? m[3] : m[4]).trim();
      segments.push({ type: "mathblock", value: expr });
    }
    lastIndex = blockRe.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ type: "text", value: text.slice(lastIndex) });

  const blocks = [];
  let listBuffer = null;
  let quoteBuffer = null;
  let uid = 0;

  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listBuffer.ordered ? "ol" : "ul";
    const key = `list-${uid++}`;
    blocks.push(
      <Tag key={key} className={listBuffer.ordered ? "md-ol" : "md-ul"}>
        {listBuffer.items.map((item, idx) => (
          <li key={idx}>{renderInline(item, `${key}-li-${idx}`)}</li>
        ))}
      </Tag>
    );
    listBuffer = null;
  };

  const flushQuote = () => {
    if (!quoteBuffer) return;
    const key = `bq-${uid++}`;
    blocks.push(
      <blockquote key={key} className="md-blockquote">
        {quoteBuffer.map((line, idx) => (
          <p key={idx} className="md-p">{renderInline(line, `${key}-${idx}`)}</p>
        ))}
      </blockquote>
    );
    quoteBuffer = null;
  };

  segments.forEach((seg, segIdx) => {
    if (seg.type === "code") {
      flushList(); flushQuote();
      blocks.push(<CodeBlock key={`code-${segIdx}`} lang={seg.lang} code={seg.value} />);
      return;
    }
    if (seg.type === "mathblock") {
      flushList(); flushQuote();
      blocks.push(<MathBlock key={`math-${segIdx}`} expr={seg.value} />);
      return;
    }

    const lines = seg.value.split("\n");
    let para = [];

    const flushPara = () => {
      if (para.length === 0) return;
      const joined = para.join(" ").trim();
      if (joined) {
        const key = `p-${uid++}`;
        blocks.push(<p key={key} className="md-p">{renderInline(joined, key)}</p>);
      }
      para = [];
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Table: a row containing "|" immediately followed by a separator row.
      if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        flushPara(); flushList(); flushQuote();
        const header = splitTableRow(line);
        let j = i + 2;
        const rows = [];
        while (j < lines.length && lines[j].includes("|") && lines[j].trim() !== "") {
          rows.push(splitTableRow(lines[j]));
          j++;
        }
        blocks.push(<TableBlock key={`table-${uid++}`} header={header} rows={rows} keyBase={`t-${segIdx}-${i}`} />);
        i = j;
        continue;
      }

      // Horizontal rule
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushPara(); flushList(); flushQuote();
        blocks.push(<hr key={`hr-${uid++}`} className="md-hr" />);
        i++;
        continue;
      }

      // Blockquote
      const quote = line.match(/^\s*>\s?(.*)/);
      if (quote) {
        flushPara(); flushList();
        if (!quoteBuffer) quoteBuffer = [];
        quoteBuffer.push(quote[1]);
        i++;
        continue;
      }
      if (quoteBuffer) flushQuote();

      // Heading
      const heading = line.match(/^(#{1,3})\s+(.*)/);
      if (heading) {
        flushPara(); flushList();
        const level = heading[1].length;
        const visualLevel = level + 2 > 6 ? 6 : level + 2;
        const HTag = `h${visualLevel}`;
        const key = `h-${uid++}`;
        blocks.push(
          <HTag key={key} className={`md-h md-h${visualLevel}`}>
            {renderInline(heading[2], key)}
          </HTag>
        );
        i++;
        continue;
      }

      // Lists
      const ulItem = line.match(/^\s*[-*]\s+(.*)/);
      if (ulItem) {
        flushPara();
        if (!listBuffer || listBuffer.ordered) flushList();
        if (!listBuffer) listBuffer = { ordered: false, items: [] };
        listBuffer.items.push(ulItem[1]);
        i++;
        continue;
      }
      const olItem = line.match(/^\s*\d+\.\s+(.*)/);
      if (olItem) {
        flushPara();
        if (!listBuffer || !listBuffer.ordered) flushList();
        if (!listBuffer) listBuffer = { ordered: true, items: [] };
        listBuffer.items.push(olItem[1]);
        i++;
        continue;
      }

      if (line.trim() === "") {
        flushPara(); flushList();
        i++;
        continue;
      }

      para.push(line);
      i++;
    }
    flushPara(); flushList(); flushQuote();
  });

  return <div className="md-body">{blocks}</div>;
}