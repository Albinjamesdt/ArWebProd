import { type NextRequest, NextResponse } from "next/server"
import { getDB, getPublicUrl } from "@/lib/cloudflare-client"

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // In a Cloudflare Workers environment, the env would be available in the context
    // For Next.js API routes, we'll need to handle the environment differently
    // This assumes you have set up the Cloudflare bindings in your wrangler.toml
    
    // Fetch all markers from D1 database
    const db = getDB(process.env as any);
    const { results: markers } = await db.prepare(
      "SELECT id, title, marker_image_path FROM markers ORDER BY created_at ASC"
    ).all();

    if (!markers || markers.length === 0) {
      return NextResponse.json({ error: "No markers found" }, { status: 404 });
    }

    // Get public URLs for all marker images from R2
    const markerData = markers.map((marker: any, index: number) => {
      const publicUrl = getPublicUrl("marker-images", marker.marker_image_path);

      return {
        id: marker.id,
        title: marker.title,
        imageUrl: publicUrl,
        targetIndex: index,
      };
    });

    return NextResponse.json({
      success: true,
      markers: markerData,
      // message: "Target data prepared. Use MindAR compiler to generate targets.mind file.",
      // instructions: [
      //   "1. Download marker images from the provided URLs",
      //   "2. Use MindAR image target generator: npm install -g mindar-image-target-generator",
      //   "3. Run: mindar-image-target-generator -i image1.jpg image2.jpg -o targets.mind",
      //   "4. Upload targets.mind to Cloudflare R2 bucket 'targets'",
      // ],
    });
  } catch (err: any) {
    console.error("Generate targets error:", err);
    return NextResponse.json(
      { error: "Failed to generate targets", detail: String(err) },
      { status: 500 }
    );
  }
}
