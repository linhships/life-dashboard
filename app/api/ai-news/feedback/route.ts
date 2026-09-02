import { NextRequest, NextResponse } from "next/server";
import { appendAiFeedback, readLatestAiFeedback, type Rating } from "@/lib/news";

// Mirrors /api/news/feedback exactly, just against the AI briefing's own
// separate feedback log (see lib/news.ts's appendAiFeedback/
// readLatestAiFeedback) so ratings for the two briefings never mix.
export async function GET() {
  return NextResponse.json(readLatestAiFeedback());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, date, section, headline, rating } = body as {
    id?: string;
    date?: string;
    section?: string;
    headline?: string;
    rating?: Rating;
  };

  if (!id || !date || !section || !headline || !rating) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!["down", "up", "love", "none"].includes(rating)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  appendAiFeedback({
    id,
    date,
    section,
    headline,
    rating,
    ratedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
