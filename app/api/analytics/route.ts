import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-client"

export async function POST(request: NextRequest) {
  try {
    const { markerId, userAgent, ipAddress } = await request.json()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(markerId)) {
      return NextResponse.json({ success: false, message: "Invalid marker ID" }, { status: 400 })
    }

    // Verify marker exists
    const { data: marker, error: markerError } = await supabaseAdmin
      .from("markers")
      .select("id")
      .eq("id", markerId)
      .single()

    if (markerError || !marker) {
      return NextResponse.json({ success: false, message: "Marker not found" }, { status: 404 })
    }

    // Log analytics
    const { error } = await supabaseAdmin.from("ar_analytics").insert({
      marker_id: markerId,
      user_agent: userAgent,
      ip_address: ipAddress,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Analytics error:", err)
    return NextResponse.json({ error: "Failed to log analytics" }, { status: 500 })
  }
}
