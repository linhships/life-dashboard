import { cookies } from "next/headers";
import { Backpack } from "lucide-react";

import { getGatehouseClassInfo } from "@/lib/gatehouseClassInfo";
import { GatehouseClassInfo } from "@/components/GatehouseClassInfo";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

// Milo's class details for the family view.
//
// Three things the private /gatehouse-info page shows are deliberately
// absent, and all three are absent because they are NEVER FETCHED rather
// than hidden — anything merely hidden would still sit in this page's HTML,
// and this is the one instance that leaves the house:
//
//   Passwords & Logins — getGatehouseCredentials() is never called. The
//     component omits that whole section when it receives no credentials.
//   Important Links — getGatehouseLinks() is never called. Same reasoning,
//     and its entries point at /api/gatehouse/file, which this instance
//     404s anyway (middleware.ts allows only /family and /api/family).
//   Source-message provenance — each field's `message` is dropped, so no
//     citation opens a modal. That modal renders attachments through
//     /api/gatehouse/file, outside the allowed prefix, so they would appear
//     as broken images and dead downloads. FamilyGatehouse already makes
//     the same call for the weekly digests.
export default async function FamilyGatehouseInfoPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo &amp; Arlo" />
      </main>
    );
  }

  const full = getGatehouseClassInfo();
  const classInfo = full
    ? { ...full, fields: full.fields.map((f) => ({ ...f, message: null })) }
    : null;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Backpack className="h-4 w-4" />
          <span>Class Info</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Gatehouse Info
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Which class Milo is in, his teachers, and the term dates.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/family/auth" label="Milo &amp; Arlo">
        <GatehouseClassInfo classInfo={classInfo} />
      </PasscodeAuthGuard>
    </main>
  );
}
