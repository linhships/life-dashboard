"use client";

import { useState } from "react";
import {
  Backpack,
  Dumbbell,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Link2,
  Music,
  Shirt,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import type { GatehouseMessage } from "@/lib/gatehouse";
import type { ClassInfo, ClassInfoField } from "@/lib/gatehouseClassInfo";
import type { CredentialField } from "@/lib/gatehouseCredentials";
import type { LinkField } from "@/lib/gatehouseLinks";
import { MessageModal, linkifyText } from "./gatehouseShared";

const KIT_SCHEDULE_LABEL = "Weekly kit schedule";
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// "Mon: PE kit (forest school) · Tue: uniform · ..." -> { Mon: "PE kit
// (forest school)", Tue: "uniform", ... }. Days the source text doesn't
// mention (normally Sat/Sun, since Milo isn't in on weekends) are just
// absent from the map — rendered as "No school" boxes below.
function parseKitSchedule(detail: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of detail.split("·")) {
    const seg = part.trim();
    const idx = seg.indexOf(":");
    if (idx === -1) continue;
    const day = seg.slice(0, idx).trim();
    const value = seg.slice(idx + 1).trim();
    if (day && value) map[day] = value;
  }
  return map;
}

interface KitVisual {
  Icon: LucideIcon;
  title: string;
  sub: string | null;
  boxClass: string;
  iconClass: string;
}

// Turns one day's raw text ("PE kit (forest school)", "uniform", ...) into
// an icon + label — full literal Tailwind class strings per case (not
// composed from a variable) so the build's class scanner picks them all up.
function kitVisual(value: string): KitVisual {
  const lower = value.toLowerCase();
  const subMatch = value.match(/\(([^)]+)\)/);
  const sub = subMatch ? subMatch[1] : null;

  if (lower.includes("uniform")) {
    return {
      Icon: Shirt,
      title: "Uniform",
      sub: null,
      boxClass: "border-slate-200 bg-slate-50",
      iconClass: "text-slate-500",
    };
  }
  if (sub && /forest/i.test(sub)) {
    return {
      Icon: TreePine,
      title: "PE kit",
      sub: "Forest school",
      boxClass: "border-emerald-200 bg-emerald-50",
      iconClass: "text-emerald-600",
    };
  }
  if (sub && /dance/i.test(sub)) {
    return {
      Icon: Music,
      title: "PE kit",
      sub: "Dance",
      boxClass: "border-purple-200 bg-purple-50",
      iconClass: "text-purple-600",
    };
  }
  if (lower.includes("pe kit")) {
    return {
      Icon: Dumbbell,
      title: "PE kit",
      sub,
      boxClass: "border-orange-200 bg-orange-50",
      iconClass: "text-orange-600",
    };
  }
  return {
    Icon: Backpack,
    title: value,
    sub: null,
    boxClass: "border-slate-200 bg-slate-50",
    iconClass: "text-slate-500",
  };
}

// The "Weekly kit schedule" field rendered as 7 day boxes (one line on
// desktop, wrapping on mobile) instead of the plain "Mon: X · Tue: Y ..."
// text row every other field gets — Linh asked for something quicker to
// scan at a glance than reading the sentence each morning.
function WeeklyKitScheduleBox({
  field,
  onOpen,
}: {
  field: ClassInfoField;
  onOpen: (id: string) => void;
}) {
  const schedule = parseKitSchedule(field.detail);
  return (
    <div className="mt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {KIT_SCHEDULE_LABEL}
        {field.message && (
          <button
            type="button"
            onClick={() => onOpen(field.message!.id)}
            className="text-[11px] font-semibold normal-case tracking-normal text-blue-600 hover:underline"
          >
            [source]
          </button>
        )}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-7">
        {WEEK_DAYS.map((day) => {
          const value = schedule[day];
          if (!value) {
            return (
              <div
                key={day}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-3 text-center"
              >
                <span className="text-[11px] font-semibold text-slate-400">{day}</span>
                <span className="text-[10px] text-slate-300">No school</span>
              </div>
            );
          }
          const { Icon, title, sub, boxClass, iconClass } = kitVisual(value);
          return (
            <div
              key={day}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center ${boxClass}`}
            >
              <span className="text-[11px] font-semibold text-slate-500">{day}</span>
              <Icon className={`h-5 w-5 ${iconClass}`} />
              <span className="text-[11px] font-medium leading-tight text-slate-700">{title}</span>
              {sub && <span className="text-[10px] leading-tight text-slate-400">{sub}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const kitScheduleField = classInfo.fields.find((f) => f.label === KIT_SCHEDULE_LABEL);
  const otherFields = classInfo.fields.filter((f) => f.label !== KIT_SCHEDULE_LABEL);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center gap-2">
        <Backpack className="h-4 w-4 text-amber-700" />
        <p className="text-sm font-bold text-slate-900">
          Milo is in {classInfo.className}
          {classInfo.classCode ? ` (${classInfo.classCode})` : ""}
        </p>
      </div>
      {otherFields.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {otherFields.map((f, i) => (
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
      {kitScheduleField && <WeeklyKitScheduleBox field={kitScheduleField} onOpen={onOpen} />}
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

// Static "quick reference" card for key documents/links — nursery
// booklet, department letters/overviews, etc. Sourced from
// GATEHOUSE_DIR/reports/links.md (lib/gatehouseLinks.ts). Each entry is
// either an external URL or a files/... attachment served the same way as
// a message attachment (isAttachment tells us which icon/href to use).
function ImportantLinksBox({
  links,
  onOpen,
}: {
  links: LinkField[];
  onOpen: (id: string) => void;
}) {
  if (links.length === 0) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-emerald-700" />
        <p className="text-sm font-bold text-slate-900">Important Links</p>
      </div>
      <ul className="mt-3 space-y-2">
        {links.map((l, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <a
              href={l.isAttachment ? `/api/gatehouse/file?path=${encodeURIComponent(l.href)}` : l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
            >
              {l.isAttachment ? (
                <FileText className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              )}
              {l.label}
            </a>
            {l.message && (
              <button
                type="button"
                onClick={() => onOpen(l.message!.id)}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                [source]
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GatehouseClassInfo({
  classInfo,
  credentials = [],
  links = [],
}: {
  classInfo: ClassInfo | null;
  credentials?: CredentialField[];
  links?: LinkField[];
}) {
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

  if (!classInfo && credentials.length === 0 && links.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No class info found yet. Check that GATEHOUSE_DIR points at the folder with
        reports/class-info.md, reports/credentials.md and reports/links.md.
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
    if (!openMessage) {
      for (const l of links) {
        if (l.message?.id === openMessageId) {
          openMessage = l.message;
          break;
        }
      }
    }
  }

  return (
    <div className="space-y-5">
      {classInfo && <ClassInfoBox classInfo={classInfo} onOpen={setOpenMessageId} />}
      <ImportantLinksBox links={links} onOpen={setOpenMessageId} />
      <CredentialsBox credentials={credentials} onOpen={setOpenMessageId} />

      {openMessage && <MessageModal message={openMessage} onClose={() => setOpenMessageId(null)} />}
    </div>
  );
}
