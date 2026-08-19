import { NextRequest, NextResponse } from "next/server";
import { appendMealFeedback, readLatestMealFeedback, type Kid, type KidRating } from "@/lib/mealplan";

export async function GET() {
  return NextResponse.json(readLatestMealFeedback());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, weekStart, day, meal, dish, kid, rating } = body as {
    id?: string;
    weekStart?: string;
    day?: string;
    meal?: string;
    dish?: string;
    kid?: Kid;
    rating?: KidRating;
  };

  if (!id || !weekStart || !day || !meal || !dish || !kid || !rating) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!["Milo", "Arlo"].includes(kid)) {
    return NextResponse.json({ error: "Invalid kid" }, { status: 400 });
  }
  if (!["up", "down"].includes(rating)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  appendMealFeedback({
    id,
    weekStart,
    day,
    meal,
    dish,
    kid,
    rating,
    ratedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
