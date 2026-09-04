import { cookies } from "next/headers";
import { getAllLearningResources } from "@/lib/learning";
import { LearningBoard } from "@/components/LearningBoard";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { LEARNING_AUTH_COOKIE, isAuthed } from "@/lib/learningAuth";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(LEARNING_AUTH_COOKIE)?.value);

  // Gate check happens before the data is ever fetched, so an unauthenticated
  // request never gets resource data in the page's HTML — this isn't just a
  // UI overlay hiding an already-loaded page. Same pattern as app/links/page.tsx.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/learning/auth" label="Learning" />
      </main>
    );
  }

  const resources = getAllLearningResources();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <GraduationCap className="h-4 w-4" />
          <span>{resources.length} saved</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Learning</h1>
        <p className="mt-2 text-sm text-slate-500">
          Paste a link to an article, course, or video to save it with its title, preview image,
          and description — organized into topics you can reassign any time.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/learning/auth" label="Learning">
        <LearningBoard initialResources={resources} />
      </PasscodeAuthGuard>
    </main>
  );
}
