import { NextResponse } from "next/server";
import { getPensionAllowance } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getPensionAllowance());
}
