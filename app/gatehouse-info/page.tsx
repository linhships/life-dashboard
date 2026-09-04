import { Backpack } from "lucide-react";
import { getGatehouseClassInfo } from "@/lib/gatehouseClassInfo";
import { getGatehouseCredentials } from "@/lib/gatehouseCredentials";
import { getGatehouseLinks } from "@/lib/gatehouseLinks";
import { GatehouseClassInfo } from "@/components/GatehouseClassInfo";

export const dynamic = "force-dynamic";

// Static "quick reference" half of Gatehouse: which class Milo is in, plus
// the logins/passwords Gatehouse has circulated. Not time-ordered like the
// Communication sub-page — see lib/gatehouseClassInfo.ts /
// lib/gatehouseCredentials.ts for the data model. No passcode gate: same as
// Learning/Links, unlike the photo pages under Milo & Arlo.
export default function GatehouseInfoPage() {
  const classInfo = getGatehouseClassInfo();
  const credentials = getGatehouseCredentials();
  const links = getGatehouseLinks();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Backpack className="h-4 w-4" />
          <span>Class Info</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Gatehouse — Class Info</h1>
        <p className="mt-2 text-sm text-slate-500">
          Milo&apos;s class, and the logins/passwords Gatehouse has circulated by email or
          WhatsApp. Click any highlighted item to see the original message.
        </p>
      </header>

      <GatehouseClassInfo classInfo={classInfo} credentials={credentials} links={links} />
    </main>
  );
}
