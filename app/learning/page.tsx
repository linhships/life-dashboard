import Link from "next/link";
import { cookies } from "next/headers";
import { getAllLearningResources } from "@/lib/learning";
import { getLearningGuides } from "@/lib/learningGuides";
import { getLearningTopics } from "@/lib/resources";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { LEARNING_AUTH_COOKIE, isAuthed } from "@/lib/learningAuth";
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(LEARNING_AUTH_COOKIE)?.value);

  // Gate check happens before the data is ever fetched, so an unauthenticated
  // request never gets resource data in the page's HTML — this isn't just a
  // UI overlay hiding an already-loaded page. Same pattern as app/resources/page.tsx.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/learning/auth" label="Learning" />
      </main>
    );
  }

  const resources = getAllLearningResources();
  const guides = getLearningGuides();
  const guideByTopic = new Map(guides.map((g) => [g.topic, g]));

  // One card per Learning topic (from the Resources page's "Learning topic"
  // checkboxes), whether or not it has a guide yet — plus any guide whose
  // topic isn't a current Learning topic, so nothing on disk is invisible.
  const topics = Array.from(new Set([...getLearningTopics(), ...guides.map((g) => g.topic)])).sort(
    (a, b) => a.localeCompare(b)
  );
  const resourceCount = (topic: string) => resources.filter((r) => r.topic === topic).length;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <GraduationCap className="h-4 w-4" />
          <span>
            {topics.length} {topics.length === 1 ? "topic" : "topics"} · {guides.length}{" "}
            {guides.length === 1 ? "guide" : "guides"}
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">Learning</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Each topic below is a category you&apos;ve marked as a Learning topic on the Resources
          page. The &ldquo;Learning: build study guides&rdquo; task turns a topic&apos;s saved
          resources into a step-by-step guide you can work through in short chunks.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/learning/auth" label="Learning">
        <section>
          <h2 className="text-lg font-bold text-slate-900">Study guides</h2>
          {topics.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No Learning topics yet — tick &ldquo;Learning topic&rdquo; on a category on the
              Resources page to start one.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => {
                const guide = guideByTopic.get(topic);
                const chunks = guide
                  ? guide.sections.filter((s) => s.chunkNumber !== null).length
                  : 0;
                const count = resourceCount(topic);
                return guide ? (
                  <Link
                    key={topic}
                    href={`/learning/${guide.slug}`}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-base font-bold text-slate-900 group-hover:text-blue-600">
                      {topic}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {chunks} {chunks === 1 ? "chunk" : "chunks"} · {count}{" "}
                      {count === 1 ? "resource" : "resources"}
                      {guide.generated ? ` · updated ${guide.generated}` : ""}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                      Open guide <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ) : (
                  <div
                    key={topic}
                    className="flex flex-col rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-base font-bold text-slate-900">{topic}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {count} {count === 1 ? "resource" : "resources"} · no guide yet
                    </p>
                    <p className="mt-4 text-xs text-slate-500">
                      Run &ldquo;Learning: build study guides&rdquo; from the Scheduled section to
                      create one.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </PasscodeAuthGuard>
    </main>
  );
}
