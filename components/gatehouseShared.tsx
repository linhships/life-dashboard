"use client";

// Shared bits used by both Gatehouse sub-pages (Class Info and
// Communication): the message popup modal and small formatting/linkifying
// helpers. Split out so neither page component has to duplicate this, and
// so a change to how a source message renders only has to happen once.

import { type ReactNode } from "react";
import { FileText, Mail, MessageCircle, Paperclip, X } from "lucide-react";
import type { GatehouseMessage, GatehouseSource } from "@/lib/gatehouse";

export function formatMessageDate(date: string): string {
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

export function sourceIcon(type: string) {
  return type === "whatsapp" ? (
    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
  ) : (
    <Mail className="h-3.5 w-3.5 shrink-0" />
  );
}

export function sourceLabel(source: GatehouseSource): string {
  if (source.type === "whatsapp") {
    return `WhatsApp · ${source.chat ?? "?"} · ${source.sender ?? "?"}`;
  }
  return `Email · ${source.sender ?? "?"}`;
}

export function isImageAttachment(rel: string): boolean {
  return /\.(jpe?g|png|gif|webp)$/i.test(rel);
}

export function attachmentFileName(rel: string): string {
  return rel.split("/").pop() ?? rel;
}

// Turns bare-text URLs/domains inside free text (e.g. class-info.md's
// "gatehouseschool.co.uk/parents-area — password GHS2627*") into real,
// clickable new-tab links. Negative lookbehind (?<![\w@.]) keeps it from
// matching the domain half of an email address like
// admin@gatehouseschool.co.uk. Bare domains (no scheme) get "https://"
// prepended for the href but keep their original text as the link label.
const URL_RE =
  /(?<![\w@.])((?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s,;()]*)?)/g;

export function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  for (const m of text.matchAll(URL_RE)) {
    if (m.index === undefined) continue;
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const raw = m[1];
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    parts.push(
      <a
        key={i++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {raw}
      </a>
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function MessageModal({
  message,
  onClose,
}: {
  message: GatehouseMessage;
  onClose: () => void;
}) {
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
                      target="_blank"
                      rel="noopener noreferrer"
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
