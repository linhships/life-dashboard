"use client";

import { useState, type ReactNode } from "react";
import type { GatehouseMessage } from "@/lib/gatehouse";
import type { GatehouseNotesData } from "@/lib/gatehouseNotes";
import { MessageModal, formatMessageDate, sourceIcon } from "./gatehouseShared";

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/g;

type Block =
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

// Tiny markdown-lite parser for notes.md's body: "## " headings, "- "
// bullets, and blank-line-separated paragraphs — deliberately not a full
// markdown renderer, matching this app's usual "just enough parsing for
// this one hand-authored file" approach (see lib/gatehouse*.ts).
function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let currentList: string[] | null = null;
  let currentPara: string[] | null = null;

  const flushList = () => {
    if (currentList && currentList.length) blocks.push({ type: "list", items: currentList });
    currentList = null;
  };
  const flushPara = () => {
    if (currentPara && currentPara.length) blocks.push({ type: "paragraph", text: currentPara.join(" ") });
    currentPara = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushPara();
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      flushPara();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      if (!currentList) currentList = [];
      currentList.push(line.slice(2).trim());
      continue;
    }
    flushList();
    if (!currentPara) currentPara = [];
    currentPara.push(line);
  }
  flushList();
  flushPara();
  return blocks;
}

function FootnoteMark({ n, onOpen }: { n: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mx-0.5 align-super text-[11px] font-semibold text-blue-600 hover:underline"
    >
      [{n}]
    </button>
  );
}

// Turns [[msg:id]] tokens inline into footnote markers, same convention as
// ReportBody in GatehouseWeeklyReports.tsx.
function renderInline(
  text: string,
  footnoteNumberById: Map<string, number>,
  onOpen: (id: string) => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  for (const m of text.matchAll(MSG_REF_RE)) {
    if (m.index === undefined) continue;
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const n = footnoteNumberById.get(m[1]);
    if (n !== undefined) {
      parts.push(<FootnoteMark key={i++} n={n} onOpen={() => onOpen(m[1])} />);
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// Page-level footnote list — same look/behaviour as FootnoteList in
// GatehouseWeeklyReports.tsx, just not scoped to a single week's report.
function FootnoteList({
  messages,
  onOpen,
}: {
  messages: GatehouseMessage[];
  onOpen: (id: string) => void;
}) {
  if (messages.length === 0) return null;
  return (
    <ol className="mt-5 space-y-1 text-xs text-slate-500">
      {messages.map((m, i) => (
        <li key={m.id} className="flex items-start gap-1.5">
          <span className="font-semibold text-slate-400">[{i + 1}]</span>
          <button
            type="button"
            onClick={() => onOpen(m.id)}
            className="group flex min-w-0 items-center gap-1.5 text-left text-slate-400"
          >
            <span className="group-hover:text-blue-700">
              {sourceIcon(m.sources[0]?.type ?? "email")}
            </span>
            <span className="shrink-0 group-hover:text-blue-700">{formatMessageDate(m.date)}</span>
            <span className="truncate text-slate-600 group-hover:text-blue-700 group-hover:underline">
              {m.title}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function GatehouseNotes({ notes }: { notes: GatehouseNotesData | null }) {
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

  if (!notes) {
    return (
      <p className="text-sm text-slate-500">
        No notes found yet. Check that GATEHOUSE_DIR points at the folder with reports/notes.md.
      </p>
    );
  }

  const footnoteNumberById = new Map(notes.messages.map((m, i) => [m.id, i + 1]));
  const blocks = parseBlocks(notes.body);
  const openMessage = openMessageId
    ? (notes.messages.find((m) => m.id === openMessageId) ?? null)
    : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          {blocks.map((b, i) => {
            if (b.type === "heading") {
              return (
                <h2 key={i} className="pt-2 text-base font-bold text-slate-900 first:pt-0">
                  {b.text}
                </h2>
              );
            }
            if (b.type === "list") {
              return (
                <ul key={i} className="list-disc space-y-1 pl-5">
                  {b.items.map((item, j) => (
                    <li key={j}>{renderInline(item, footnoteNumberById, setOpenMessageId)}</li>
                  ))}
                </ul>
              );
            }
            return <p key={i}>{renderInline(b.text, footnoteNumberById, setOpenMessageId)}</p>;
          })}
        </div>

        <FootnoteList messages={notes.messages} onOpen={setOpenMessageId} />
      </div>

      {openMessage && <MessageModal message={openMessage} onClose={() => setOpenMessageId(null)} />}
    </div>
  );
}
