import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLearningGuide } from "@/lib/learningGuides";
import { LearningGuideView } from "@/components/LearningGuide";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { LEARNING_AUTH_COOKIE, isAuthed } from "@/lib/learningAuth";

export const dynamic = "force-dynamic";

// One study guide (data/learning-guides/<slug>.md, see lib/learningGuides.ts)
// per Learning topic. Same passcode gate as the Learning page itself.
export default async function LearningGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(LEARNING_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/learning/auth" label="Learning" />
      </main>
    );
  }

  const guide = getLearningGuide(slug);
  if (!guide) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <PasscodeAuthGuard authEndpoint="/api/learning/auth" label="Learning">
        <LearningGuideView guide={guide} />
      </PasscodeAuthGuard>
    </main>
  );
}
