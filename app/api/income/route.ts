import { NextResponse } from "next/server";
import { getIncome } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getIncome());
}
