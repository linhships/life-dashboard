import { NextRequest, NextResponse } from "next/server";
import { appendGroceryCheck, readLatestGroceryChecks } from "@/lib/mealplan";

export async function GET() {
  return NextResponse.json(readLatestGroceryChecks());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, weekStart, section, subheading, text, checked } = body as {
    id?: string;
    weekStart?: string;
    section?: string;
    subheading?: string | null;
    text?: string;
    checked?: boolean;
  };

  if (!id || !weekStart || !section || !text || typeof checked !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  appendGroceryCheck({
    id,
    weekStart,
    section,
    subheading: subheading ?? null,
    text,
    checked,
    checkedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
