import { NextRequest, NextResponse } from "next/server";
import { getLearningTopics, setCategoryLearning } from "@/lib/resources";
import { isAuthedRequest } from "@/lib/resourcesAuth";

// Per-category settings for Resources — currently just which categories
// are Learning topics (see lib/resources.ts). Same passcode guard as the
// rest of /api/resources.
function unauthorized() {
  return NextResponse.json({ error: "Locked" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  return NextResponse.json({ learningTopics: getLearningTopics() });
}

// Body: { category: string, learning: boolean }. Returns the full updated
// topic list so the client can replace its copy wholesale.
export async function PATCH(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const { category, learning } = body as { category?: string; learning?: boolean };
  if (!category || typeof category !== "string" || typeof learning !== "boolean") {
    return NextResponse.json({ error: "Missing category or learning" }, { status: 400 });
  }
  return NextResponse.json({ learningTopics: setCategoryLearning(category, learning) });
}
