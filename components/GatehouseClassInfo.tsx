"use client";

import { useState } from "react";
import { Backpack, ExternalLink, Eye, EyeOff, KeyRound } from "lucide-react";
import type { GatehouseMessage } from "@/lib/gatehouse";
import type { ClassInfo } from "@/lib/gatehouseClassInfo";
import type { CredentialField } from "@/lib/gatehouseCredentials";
import { MessageModal, linkifyText } from "./gatehouseShared";

// Static "quick reference" card for Milo's actual class — not time-ordered,
// so it's just a fixed box rather than living inside a month section.
// Sourced from GATEHOUSE_DIR/reports/class-info.md (lib/gatehouseClassInfo.ts).
function ClassInfoBox({
  classInfo,
  onOpen,
}: {
  classInfo: ClassInfo;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center gap-2">
        <Backpack className="h-4 w-4 text-amber-700" />
        <p className="text-sm font-bold text-slate-900">
          Milo is in {classInfo.className}
          {classInfo.classCode ? ` (${classInfo.classCode})` : ""}
        </p>
      </div>
      {classInfo.fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {classInfo.fields.map((f, i) => (
            <div key={i} className="text-sm">
              <dt className="font-semibold text-slate-500">{f.label}</dt>
              <dd className="text-slate-700">
                {linkifyText(f.detail)}
                {f.message && (
                  <button
                    type="button"
                    onClick={() => onOpen(f.message!.id)}
                    className="ml-1 align-super text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    [source]
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// Static "quick reference" card for logins/passwords circulated by email
// or WhatsApp (bus tracker app, parents area website, etc.) — same
// not-time-ordered treatment as ClassInfoBox, sourced from
// GATEHOUSE_DIR/reports/credentials.md (lib/gatehouseCredentials.ts).
// Passwords are masked by default with a per-row reveal toggle, since this
// is sensitive info sitting on an otherwise ungated page.
function CredentialsBox({
  credentials,
  onOpen,
}: {
  credentials: CredentialField[];
  onOpen: (id: string) => void;
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  if (credentials.length === 0) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-rose-700" />
        <p className="text-sm font-bold text-slate-900">Passwords &amp; Logins</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Circulated by Gatehouse via email or WhatsApp — click the eye to reveal.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-1.5 pr-4">Service</th>
              <th className="pb-1.5 pr-4">Login</th>
              <th className="pb-1.5 pr-4">Password</th>
              <th className="pb-1.5 pr-4">Login link</th>
              <th className="pb-1.5" />
            </tr>
          </thead>
          <tbody>
            {credentials.map((c, i) => (
              <tr key={i} className="border-t border-rose-100/80">
                <td className="py-1.5 pr-4 font-medium text-slate-700">{c.service}</td>
                <td className="py-1.5 pr-4 text-slate-600">{c.login || "—"}</td>
                <td className="py-1.5 pr-4 font-mono text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    {revealed[i] ? c.password : "•".repeat(Math.max(6, c.password.length))}
                    <button
                      type="button"
                      onClick={() => setRevealed((prev) => ({ ...prev, [i]: !prev[i] }))}
                      title={revealed[i] ? "Hide" : "Reveal"}
                      className="text-slate-400 hover:text-rose-700"
                    >
                      {revealed[i] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </span>
                </td>
                <td className="py-1.5 pr-4">
                  {c.loginUrl && (
                    <a
                      href={c.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      Log in
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {c.message && (
                    <button
                      type="button"
                      onClick={() => onOpen(c.message!.id)}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      [source]
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GatehouseClassInfo({
  classInfo,
  credentials = [],
}: {
  classInfo: ClassInfo | null;
  credentials?: CredentialField[];
}) {
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

  if (!classInfo && credentials.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No class info found yet. Check that GATEHOUSE_DIR points at the folder with
        reports/class-info.md and reports/credentials.md.
      </p>
    );
  }

  let openMessage: GatehouseMessage | null = null;
  if (openMessageId) {
    for (const f of classInfo?.fields ?? []) {
      if (f.message?.id === openMessageId) {
        openMessage = f.message;
        break;
      }
    }
    if (!openMessage) {
      for (const c of credentials) {
        if (c.message?.id === openMessageId) {
          openMessage = c.message;
          break;
        }
      }
    }
  }

  return (
    <div className="space-y-5">
      {classInfo && <ClassInfoBox classInfo={classInfo} onOpen={setOpenMessageId} />}
      <CredentialsBox credentials={credentials} onOpen={setOpenMessageId} />

      {openMessage && <MessageModal message={openMessage} onClose={() => setOpenMessageId(null)} />}
    </div>
  );
}
