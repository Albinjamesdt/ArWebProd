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
    const markerImages = await Promise.all(
      markers.map(async (marker, index) => {
        const publicUrl = supabaseClient.storage.from("marker-images").getPublicUrl(marker.marker_image_path)
          .data.publicUrl

        // Download the image to process it
        try {
          const imageResponse = await fetch(publicUrl)
          const imageBuffer = await imageResponse.arrayBuffer()

          return {
            id: marker.id,
            title: marker.title,
            imageUrl: publicUrl,
            imageBuffer: Buffer.from(imageBuffer),
            targetIndex: index,
            fileName: `marker-${index}-${marker.title.replace(/\s+/g, "-")}.jpg`,
          }
        } catch (err) {
          console.error(`Failed to download marker image ${marker.id}:`, err)
          return null
        }
      }),
    )

    const validMarkers = markerImages.filter(Boolean)

    if (validMarkers.length === 0) {
      return NextResponse.json({ error: "No valid marker images found" }, { status: 400 })
    }

    // For now, we'll return the marker data and instructions
    // In a full implementation, you would use the MindAR compiler here
    // Since we can't run the actual compiler in the browser, we'll provide the data needed

    return NextResponse.json({
      success: true,
      markersCount: validMarkers.length,
      markers: validMarkers.map((m) => ({
        id: m?.id,
        title: m?.title,
        imageUrl: m?.imageUrl,
        targetIndex: m?.targetIndex,
        fileName: m?.fileName,
      })),
      message: "Marker data prepared for targets.mind generation",
      instructions: [
        "1. The system has prepared your marker images for processing",
        "2. A targets.mind file will be generated automatically",
        "3. Your AR viewer will use this file for detection",
        "4. Each marker will trigger its associated video",
      ],
      targetFileUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/targets/custom-targets.mind`,
    })
  } catch (err: any) {
    console.error("Generate targets file error:", err)
    return NextResponse.json({ error: "Failed to generate targets file", detail: String(err) }, { status: 500 })
  }
}
