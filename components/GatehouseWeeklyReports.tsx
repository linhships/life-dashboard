"use client";

import { useState } from "react";
import { FileText, Mail, MessageCircle, Paperclip, X } from "lucide-react";
import type { GatehouseMessage, GatehouseSource } from "@/lib/gatehouse";

export interface WeekReportData {
  weekStart: string; // ISO date, Monday
  weekEnd: string; // ISO date, Sunday
  body: string; // markdown-ish prose with [[msg:id]] tokens
  messages: GatehouseMessage[]; // every message this week's body references
}

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/g;

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  const startStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const endStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function formatMessageDate(date: string): string {
  // date is "YYYY-MM-DD HH:MM"
  const d = new Date(date.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceIcon(type: string) {
  return type === "whatsapp" ? (
    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
  ) : (
    <Mail className="h-3.5 w-3.5 shrink-0" />
  );
}

function sourceLabel(source: GatehouseSource): string {
  if (source.type === "whatsapp") {
    return `WhatsApp · ${source.chat ?? "?"} · ${source.sender ?? "?"}`;
  }
  return `Email · ${source.sender ?? "?"}`;
}

function isImageAttachment(rel: string): boolean {
  return /\.(jpe?g|png|gif|webp)$/i.test(rel);
}

function attachmentFileName(rel: string): string {
  return rel.split("/").pop() ?? rel;
}

function MessageChip({ message, onOpen }: { message: GatehouseMessage; onOpen: () => void }) {
  const primaryType = message.sources[0]?.type ?? "email";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[13px] font-medium text-blue-700 align-baseline hover:bg-blue-100"
    >
      {sourceIcon(primaryType)}
      {message.title}
    </button>
  );
}

// Renders a report body's paragraphs, turning [[msg:id]] tokens into
// clickable MessageChips inline with the surrounding prose. Deliberately
// not routed through react-markdown — report bodies are plain paragraphs,
// no headings/lists, so a simple paragraph + token split is enough and
// keeps the click targets easy to reason about.
function ReportBody({
  body,
  messagesById,
  onOpen,
}: {
  body: string;
  messagesById: Map<string, GatehouseMessage>;
  onOpen: (id: string) => void;
}) {
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {paragraphs.map((para, pIdx) => {
        const parts: (string | { ref: string })[] = [];
        let lastIndex = 0;
        for (const m of para.matchAll(MSG_REF_RE)) {
          if (m.index === undefined) continue;
          if (m.index > lastIndex) parts.push(para.slice(lastIndex, m.index));
          parts.push({ ref: m[1] });
          lastIndex = m.index + m[0].length;
        }
        if (lastIndex < para.length) parts.push(para.slice(lastIndex));

        return (
          <p key={pIdx}>
            {parts.map((part, i) => {
              if (typeof part === "string") return <span key={i}>{part}</span>;
              const message = messagesById.get(part.ref);
              if (!message) return null;
              return (
                <MessageChip key={i} message={message} onOpen={() => onOpen(message.id)} />
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

function MessageModal({ message, onClose }: { message: GatehouseMessage; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{message.title}</h2>
            <p className="mt-1 text-xs text-slate-400">{formatMessageDate(message.date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-1.5">
            {message.sources.map((source, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                {sourceIcon(source.type)}
                <span className="font-medium text-slate-600">{sourceLabel(source)}</span>
                {source.subject && <span>— &ldquo;{source.subject}&rdquo;</span>}
                {source.note && <span className="italic text-slate-400">({source.note})</span>}
              </div>
            ))}
          </div>

          <div className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm text-slate-700">
            {message.body}
          </div>

          {message.attachments.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments
              </p>
              <div className="flex flex-wrap gap-3">
                {message.attachments.map((rel) =>
                  isImageAttachment(rel) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a
                      key={rel}
                      href={`/api/gatehouse/file?path=${encodeURIComponent(rel)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={`/api/gatehouse/file?path=${encodeURIComponent(rel)}`}
                        alt=""
                        className="h-28 w-28 rounded-lg border border-slate-200 object-cover hover:opacity-90"
                      />
                    </a>
                  ) : (
                    <a
                      key={rel}
                      href={`/api/gatehouse/file?path=${encodeURIComponent(rel)}`}
                      className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      {attachmentFileName(rel)}
                    </a>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GatehouseWeeklyReports({ reports }: { reports: WeekReportData[] }) {
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No weekly reports found yet. Check that GATEHOUSE_DIR points at the folder with
        messages/ and reports/.
      </p>
    );
  }

  let openMessage: GatehouseMessage | null = null;
  if (openMessageId) {
    for (const r of reports) {
      const found = r.messages.find((m) => m.id === openMessageId);
      if (found) {
        openMessage = found;
        break;
      }
    }
  }

  return (
    <div className="space-y-5">
      {reports.map((report) => {
        const messagesById = new Map(report.messages.map((m) => [m.id, m]));
        return (
          <div
            key={report.weekStart}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-sm font-bold text-slate-900">
              Week of {formatWeekRange(report.weekStart, report.weekEnd)}
            </h3>
            <div className="mt-3">
              <ReportBody
                body={report.body}
                messagesById={messagesById}
                onOpen={setOpenMessageId}
              />
            </div>
          </div>
        );
      })}

      {openMessage && <MessageModal message={openMessage} onClose={() => setOpenMessageId(null)} />}
    </div>
  );
}
