import { NextResponse } from "next/server";
import { getRetirementModel } from "@/lib/data";

export async function GET() {
  const model = await getRetirementModel();
  return NextResponse.json(model);
}
