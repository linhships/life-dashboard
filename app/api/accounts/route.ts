import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getAccounts());
}
