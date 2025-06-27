import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, supabaseClient } from "@/lib/supabase-client"

export async function POST(request: NextRequest) {
  try {
    // Fetch all markers
    const { data: markers, error } = await supabaseAdmin
      .from("markers")
      .select("id, title, marker_image_path")
      .order("created_at", { ascending: true })

    if (error) throw error

    if (!markers || markers.length === 0) {
      return NextResponse.json({ error: "No markers found" }, { status: 404 })
    }

    // Get public URLs for all marker images
    const markerData = markers.map((marker, index) => {
      const publicUrl = supabaseClient.storage.from("marker-images").getPublicUrl(marker.marker_image_path)
        .data.publicUrl

      return {
        id: marker.id,
        title: marker.title,
        imageUrl: publicUrl,
        targetIndex: index,
      }
    })

    // For now, return the marker data that can be used to generate targets
    // In a full implementation, you would use the MindAR compiler here
    return NextResponse.json({
      success: true,
      markers: markerData,
      message: "Target data prepared. Use MindAR compiler to generate targets.mind file.",
      instructions: [
        "1. Download marker images from the provided URLs",
        "2. Use MindAR image target generator: npm install -g mindar-image-target-generator",
        "3. Run: mindar-image-target-generator -i image1.jpg image2.jpg -o targets.mind",
        "4. Upload targets.mind to Supabase Storage bucket 'targets'",
      ],
    })
  } catch (err: any) {
    console.error("Generate targets error:", err)
    return NextResponse.json({ error: "Failed to generate targets", detail: String(err) }, { status: 500 })
  }
}
