import { NextRequest, NextResponse } from "next/server";
import { getGatehouseMessage } from "@/lib/gatehouse";

// No passcode gate on this section (see components/Sidebar.tsx / the
// Gatehouse page) — same as Learning/Links, unlike the two other
// Milo & Arlo pages which contain photos of the kids.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const message = getGatehouseMessage(id);
  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(message);
}
