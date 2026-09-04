"use client";

import { useState, type ReactNode } from "react";
import { NotebookText } from "lucide-react";
import type { GatehouseMessage } from "@/lib/gatehouse";
import type { GatehouseNotesData } from "@/lib/gatehouseNotes";
import { MessageModal, formatDateOnly } from "./gatehouseShared";

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/g;
// A heading line's own source token, e.g. "## Title [[msg:some-id]]" —
// anchored to the end of the line so it's only picked up from the heading
// itself, not from prose elsewhere that happens to mention a message.
const HEADING_REF_RE = /\s*\[\[msg:([a-zA-Z0-9_-]+)\]\]\s*$/;

type Block = { type: "list"; items: string[] } | { type: "paragraph"; text: string };

interface Section {
  heading: string;
  messageId: string | null;
  blocks: Block[];
}

// Tiny markdown-lite parser for notes.md's body: each "## Heading
// [[msg:id]]" line starts a new section/box (the trailing token is that
// document's source message, stripped from the displayed heading text),
// followed by "- " bullets and blank-line-separated paragraphs until the
// next heading. Anything before the first heading is treated as an
// editorial comment for whoever edits the file (same convention as the
// unrendered preamble in class-info.md/credentials.md/links.md) and isn't
// displayed.
function parseSections(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  let currentList: string[] | null = null;
  let currentPara: string[] | null = null;

  const flushList = () => {
    if (current && currentList && currentList.length) {
      current.blocks.push({ type: "list", items: currentList });
    }
    currentList = null;
  };
  const flushPara = () => {
    if (current && currentPara && currentPara.length) {
      current.blocks.push({ type: "paragraph", text: currentPara.join(" ") });
    }
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
      const rest = line.slice(3).trim();
      const m = rest.match(HEADING_REF_RE);
      const heading = m ? rest.slice(0, m.index).trim() : rest;
      current = { heading, messageId: m ? m[1] : null, blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue; // ignore anything before the first heading
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
  return sections;
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

// Turns any inline [[msg:id]] tokens into footnote markers — not used by
// the current notes.md content (source is now shown once per box, in the
// header), but kept so a future note can still cite a message inline if
// it ever needs to reference something other than its box's own document.
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

// One box per source document — header shows the document title, the date
// it was received (its source message's date), and a [source] link into
// the shared message modal; body is that document's summarised content.
function NoteBox({
  section,
  message,
  onOpen,
}: {
  section: Section;
  message: GatehouseMessage | null;
  onOpen: (id: string) => void;
}) {
  const footnoteNumberById = message ? new Map([[message.id, 1]]) : new Map<string, number>();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <NotebookText className="h-4 w-4 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">{section.heading}</h2>
        </div>
        {message && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Received {formatDateOnly(message.date)}</span>
            <button
              type="button"
              onClick={() => onOpen(message.id)}
              className="font-semibold text-blue-600 hover:underline"
            >
              [source]
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
        {section.blocks.map((b, i) => {
          if (b.type === "list") {
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, footnoteNumberById, onOpen)}</li>
                ))}
              </ul>
            );
          }
          return <p key={i}>{renderInline(b.text, footnoteNumberById, onOpen)}</p>;
        })}
      </div>
    </div>
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

  const sections = parseSections(notes.body);
  const byId = new Map(notes.messages.map((m) => [m.id, m]));
  const openMessage = openMessageId ? (byId.get(openMessageId) ?? null) : null;

  if (sections.length === 0) {
    return <p className="text-sm text-slate-500">Notes found, but no sections to show yet.</p>;
  }

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <NoteBox
          key={i}
          section={section}
          message={section.messageId ? (byId.get(section.messageId) ?? null) : null}
          onOpen={setOpenMessageId}
        />
      ))}

      {openMessage && <MessageModal message={openMessage} onClose={() => setOpenMessageId(null)} />}
    </div>
  );
}
