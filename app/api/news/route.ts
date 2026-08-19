import { NextResponse } from "next/server";
import { getLatestBriefing } from "@/lib/news";

export async function GET() {
  const briefing = getLatestBriefing();
  if (!briefing) {
    return NextResponse.json({ error: "No briefing found" }, { status: 404 });
  }
  return NextResponse.json(briefing);
}
