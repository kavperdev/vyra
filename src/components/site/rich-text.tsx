import * as React from "react";

/**
 * Renders the simple text format used in the panel editors, without HTML:
 *   ## heading, ### subheading, "- " bullets, "1. " numbered items,
 *   blank line = new paragraph, **bold**, [text](https://link).
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyBase}-b${i++}`}>{m[1]}</strong>);
    else out.push(
      <a key={`${keyBase}-a${i++}`} href={m[3]} target="_blank" rel="noreferrer" className="underline underline-offset-4">
        {m[2]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      const k = `p${blocks.length}`;
      blocks.push(<p key={k}>{inline(para.join(" "), k)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = `l${blocks.length}`;
      const items = list.items.map((it, j) => <li key={`${k}-${j}`}>{inline(it, `${k}-${j}`)}</li>);
      blocks.push(list.ordered ? <ol key={k} className="list-decimal pl-6">{items}</ol> : <ul key={k} className="list-disc pl-6">{items}</ul>);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) {
      flushPara();
      flushList();
    } else if (line.startsWith("### ")) {
      flushPara();
      flushList();
      const k = `h${blocks.length}`;
      blocks.push(<h3 key={k}>{inline(line.slice(4), k)}</h3>);
    } else if (line.startsWith("## ")) {
      flushPara();
      flushList();
      const k = `h${blocks.length}`;
      blocks.push(<h2 key={k}>{inline(line.slice(3), k)}</h2>);
    } else if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <div className={className}>{blocks}</div>;
}
