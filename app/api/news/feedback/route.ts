import { NextRequest, NextResponse } from "next/server";
import { appendFeedback, readLatestFeedback, type Rating } from "@/lib/news";

export async function GET() {
  return NextResponse.json(readLatestFeedback());
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
  if (!["down", "up", "love"].includes(rating)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  appendFeedback({
    id,
    date,
    section,
    headline,
    rating,
    ratedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
