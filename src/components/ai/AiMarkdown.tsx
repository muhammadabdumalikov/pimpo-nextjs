"use client";
import { Fragment, memo, type ReactNode } from "react";

/**
 * Renders the tiny Markdown subset the backend prompt allows the model to
 * emit — **bold**, "- " bullets, "1. " numbered lists, blank-line paragraphs
 * (plus *italic* and _italic_ defensively). Hand-rolled to React nodes: no HTML
 * strings, no dependencies. Forbidden syntax that still slips through
 * (headings, tables, backticks, rules) degrades to readable text instead of
 * showing markup.
 *
 * The typewriter feeds this PARTIAL text every animation frame, so the
 * grammar is written to be stable mid-word: an unterminated `**` renders its
 * tail already bold (the emphasis "grows" as it types, no literal asterisk
 * flash), and a half-typed list/heading marker on the final line is hidden
 * until it has content, so block structure never visibly re-decides itself.
 */

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[]; start: number };

// A final line that is only a half-typed marker ("-", "1.", "##", "--").
const TAIL_PARTIAL_RE = /^(?:[-*_•]{1,2}|\d{1,3}[.)]?|#{1,6})$/;
const HEADING_RE = /^#{1,6}\s*(.*)$/;
const BULLET_RE = /^[-*•]\s+(.*)$/;
const ORDERED_RE = /^(\d{1,3})[.)]\s+(.*)$/;

function parseBlocks(text: string): Block[] {
  const rawLines = text.split("\n");
  const blocks: Block[] = [];
  // Tracks blank-line separators so consecutive plain lines join into one
  // paragraph (single newline = line break) while a blank line splits them.
  let broke = true;
  for (let idx = 0; idx < rawLines.length; idx++) {
    // Backticks never render — inline code / fence lines degrade to bare text.
    let trimmed = rawLines[idx].replace(/`+/g, "").trim();
    if (!trimmed) {
      broke = true;
      continue;
    }
    if (idx === rawLines.length - 1 && TAIL_PARTIAL_RE.test(trimmed)) continue;
    // Horizontal rules and table separator rows are pure markup noise.
    if (/^[-*_]{3,}$/.test(trimmed) || (trimmed.includes("|") && /^[|\s:-]+$/.test(trimmed))) {
      broke = true;
      continue;
    }
    // A table row degrades to its cell text, dot-separated.
    if (trimmed.includes("|")) {
      trimmed = trimmed
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(" · ");
    }
    let m = HEADING_RE.exec(trimmed);
    if (m) {
      if (m[1].trim()) blocks.push({ kind: "h", text: m[1].trim() });
      broke = true;
      continue;
    }
    m = BULLET_RE.exec(trimmed);
    if (m) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(m[1]);
      else blocks.push({ kind: "ul", items: [m[1]] });
      broke = false;
      continue;
    }
    m = ORDERED_RE.exec(trimmed);
    if (m) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ol") last.items.push(m[2]);
      else blocks.push({ kind: "ol", items: [m[2]], start: parseInt(m[1], 10) || 1 });
      broke = false;
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === "p" && !broke) last.lines.push(trimmed);
    else blocks.push({ kind: "p", lines: [trimmed] });
    broke = false;
  }
  return blocks;
}

const strongClass = "font-semibold text-gray-900 dark:text-white";

function renderInline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = "";
  let key = 0;
  let i = 0;
  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };
  while (i < s.length) {
    const ch = s[i];
    if (ch === "*" && s[i + 1] === "*") {
      // No closer ⇒ the bold is still being typed: render the tail already
      // emphasized so it grows in place instead of flashing raw asterisks.
      const close = s.indexOf("**", i + 2);
      const inner = close === -1 ? s.slice(i + 2) : s.slice(i + 2, close);
      flush();
      if (inner) {
        out.push(
          <strong key={key++} className={strongClass}>
            {renderInline(inner)}
          </strong>,
        );
      }
      i = close === -1 ? s.length : close + 2;
      continue;
    }
    if (ch === "*" || ch === "_") {
      const close = s.indexOf(ch, i + 1);
      if (close > i + 1) {
        flush();
        out.push(<em key={key++}>{renderInline(s.slice(i + 1, close))}</em>);
        i = close + 1;
        continue;
      }
      // A trailing lone marker is the first half of one mid-typing — hide it.
      // Anywhere else an unpaired marker is honest content, keep it literal.
      if (i === s.length - 1) {
        i++;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

const listClass =
  "list-outside space-y-1 pl-5 marker:text-gray-400 dark:marker:text-gray-500";

function AiMarkdownBase({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    // tabular-nums inherits to every figure in the prose — the answers are
    // mostly numbers and this keeps them steady while the reveal types.
    <div className="space-y-2.5 text-sm leading-relaxed tabular-nums text-gray-800 dark:text-gray-200">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h":
            return (
              <p key={i} className={strongClass}>
                {renderInline(b.text)}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className={`list-disc ${listClass}`}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} start={b.start} className={`list-decimal ${listClass}`}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={i}>
                {b.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {renderInline(line)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}

// memo: only the still-revealing tail part re-parses per animation frame —
// finished parts and finished turns compare equal (string props compare by
// value) and skip entirely.
const AiMarkdown = memo(AiMarkdownBase);
export default AiMarkdown;
