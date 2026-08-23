import { NextRequest, NextResponse } from "next/server";
import { getDrawdown } from "@/lib/data";
import { isAuthedRequest } from "@/lib/financeAuth";

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  return NextResponse.json(getDrawdown());
}
