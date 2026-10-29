import { NextRequest, NextResponse } from "next/server";
import { isWeekSkipped, readSkippedWeeks, setWeekSkipped } from "@/lib/mealplan";

export async function GET() {
  return NextResponse.json(readSkippedWeeks());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { weekStart, skipped } = body as { weekStart?: string; skipped?: boolean };

  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart must be an ISO date" }, { status: 400 });
  }
  if (typeof skipped !== "boolean") {
    return NextResponse.json({ error: "skipped must be a boolean" }, { status: 400 });
  }

  setWeekSkipped(weekStart, skipped);
  return NextResponse.json({ ok: true, skipped: isWeekSkipped(weekStart) });
}
