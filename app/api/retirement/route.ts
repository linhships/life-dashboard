import { NextRequest, NextResponse } from "next/server";
import { getRetirementModel } from "@/lib/data";
import { isAuthedRequest } from "@/lib/financeAuth";

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const model = await getRetirementModel();
  return NextResponse.json(model);
}
