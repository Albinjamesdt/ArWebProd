export const runtime = 'edge'
import { type NextRequest, NextResponse } from "next/server"

// Cloudflare R2 and D1 types
type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const { params } = await Promise.resolve(context);
  const { id } = params;

  try {
    // Get environment bindings (Cloudflare Workers)
    const env = process.env as unknown as Env;

    // Get marker details from D1 database
    const marker = await env.DB.prepare(
      "SELECT marker_image_path, video_path FROM markers WHERE id = ?"
    ).bind(id).first();

    if (!marker) {
      return NextResponse.json(
        { error: "Marker not found" },
        { status: 404 }
      );
    }

    // Delete files from R2 storage if they exist
    if (marker.marker_image_path && !marker.marker_image_path.startsWith("http")) {
      try {
        await env.BUCKET.delete(marker.marker_image_path);
      } catch (error) {
        console.error("Error deleting marker image:", error);
        // Continue even if file deletion fails
      }
    }

    if (marker.video_path && !marker.video_path.startsWith("http")) {
      try {
        await env.BUCKET.delete(marker.video_path);
      } catch (error) {
        console.error("Error deleting video:", error);
        // Continue even if file deletion fails
      }
    }

    // Delete from D1 database
    const result = await env.DB.prepare(
      "DELETE FROM markers WHERE id = ?"
    ).bind(id).run();

    if (!result.success) {
      throw new Error("Failed to delete marker from database");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`DELETE /api/markers/${id} error:`, err);
    return NextResponse.json(
      { error: "Failed to delete marker", detail: String(err) },
      { status: 500 }
    );
  }
}