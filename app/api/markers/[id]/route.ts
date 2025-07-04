import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-client"

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const { params } = await Promise.resolve(context);
  const { id } = await params;

  try {
    // Get marker details first
    const { data: marker, error: fetchError } = await supabaseAdmin
      .from("markers")
      .select("marker_image_path, video_path")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError
    if (!marker) {
      return NextResponse.json({ error: "Marker not found" }, { status: 404 })
    }

    // Delete files from storage
    if (marker.marker_image_path && !marker.marker_image_path.startsWith("http")) {
      await supabaseAdmin.storage.from("marker-images").remove([marker.marker_image_path])
    }

    if (marker.video_path && !marker.video_path.startsWith("http")) {
      await supabaseAdmin.storage.from("marker-videos").remove([marker.video_path])
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin.from("markers").delete().eq("id", id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(`DELETE /api/markers/${id} error:`, err)
    return NextResponse.json({ error: "Failed to delete marker", detail: String(err) }, { status: 500 })
  }
}
