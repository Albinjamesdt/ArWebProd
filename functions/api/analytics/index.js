// functions\api\analytics\index.js
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "../../../lib/cloudflare-client.js";

export const runtime = "edge";

export async function POST(request) {
  let body = await request.json();
  const { markerId, userAgent, ipAddress } = body;

  // validate…
  const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRx.test(markerId)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const db = getDB();
  await db.prepare(
    `INSERT INTO ar_analytics
     (marker_id, user_agent, ip_address, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
  .bind(markerId, userAgent, ipAddress)
  .run();

  return NextResponse.json({ success: true });
}
