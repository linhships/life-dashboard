import { NextResponse } from "next/server";
import { getDrawdown } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getDrawdown());
}
