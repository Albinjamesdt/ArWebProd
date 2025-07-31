import { type NextRequest, NextResponse } from "next/server"
import { getDB } from "@/lib/cloudflare-client"

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { markerId, userAgent, ipAddress } = await request.json()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(markerId)) {
      return NextResponse.json(
        { success: false, message: "Invalid marker ID" },
        { status: 400 }
      )
    }

    // Get Cloudflare D1 database instance
    const db = getDB(process.env as any);

    try {
      // Verify marker exists
      const marker = await db.prepare(
        "SELECT id FROM markers WHERE id = ?"
      ).bind(markerId).first();

      if (!marker) {
        return NextResponse.json(
          { success: false, message: "Marker not found" },
          { status: 404 }
        )
      }

      // Log analytics
      await db.prepare(
        `INSERT INTO ar_analytics (marker_id, user_agent, ip_address, created_at)
         VALUES (?, ?, ?, datetime('now'))`
      ).bind(markerId, userAgent, ipAddress).run();

      return NextResponse.json({ success: true })
    } catch (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }
  } catch (err: any) {
    console.error("Analytics error:", err)
    return NextResponse.json(
      { error: "Failed to log analytics", detail: String(err) },
      { status: 500 }
    )
  }
}
