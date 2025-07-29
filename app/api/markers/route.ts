// app\api\markers\route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-client";
import { uploadFile, getPublicUrl } from "@/lib/r2-client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
export const runtime = 'edge';
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: rows, error } = await supabaseAdmin
      .from("markers")
      .select("id, title, marker_image_path, video_path, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const markers =
      rows?.map((m) => {
        const markerImageUrl = getPublicUrl(`marker-images/${m.marker_image_path}`);

        const videoUrl = getPublicUrl(`marker-videos/${m.video_path}`);

        return {
          id: m.id,
          title: m.title,
          markerImageUrl,
          videoUrl,
          createdAt: m.created_at,
        };
      }) || [];

    return NextResponse.json(markers);
  } catch (err: any) {
    console.error("GET /api/markers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch markers", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const markerFile = formData.get("markerImage") as File | null;
    const videoFile = formData.get("video") as File | null;
    const videoUrl = formData.get("videoUrl") as string;

    if (!title || !markerFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upload marker image
    const markerExt = markerFile.name.split(".").pop();
    const markerFileName = `marker-${Date.now()}.${markerExt}`;
    const markerBuffer = await markerFile.arrayBuffer();

    await uploadFile(`marker-images/${markerFileName}`, Buffer.from(markerBuffer), markerFile.type);

    // Handle video upload or URL
    let videoPath: string;
    if (videoFile) {
      const videoExt = videoFile.name.split(".").pop();
      const videoFileName = `video-${Date.now()}.${videoExt}`;
      const videoBuffer = await videoFile.arrayBuffer();

      await uploadFile(`marker-videos/${videoFileName}`, Buffer.from(videoBuffer), videoFile.type);
      videoPath = videoFileName;
    } else if (videoUrl) {
      videoPath = videoUrl;
    } else {
      return NextResponse.json(
        { error: "Missing video file or URL" },
        { status: 400 }
      );
    }

    // Insert into database
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("markers")
      .insert({
        title,
        marker_image_path: markerFileName,
        video_path: videoPath,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Return with public URLs
    const markerImageUrl = getPublicUrl(`marker-images/${markerFileName}`);

    const finalVideoUrl = videoFile ? getPublicUrl(`marker-videos/${videoPath}`) : videoPath;

    return NextResponse.json(
      {
        id: inserted.id,
        title: inserted.title,
        markerImageUrl,
        videoUrl: finalVideoUrl,
        createdAt: inserted.created_at,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/markers error:", err);
    return NextResponse.json(
      { error: "Failed to create marker", detail: String(err) },
      { status: 500 }
    );
  }
}
