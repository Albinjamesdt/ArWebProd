// app/api/markers/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { uploadFile, getPublicUrl } from "@/lib/r2-client";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth-options";

// Simple in-memory storage (replace with R2 metadata storage)
let markers: any[] = [];

export async function GET() {
  try {
    const session = await getServerSession(getAuthOptions());
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
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
    const session = await getServerSession(getAuthOptions());
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const markerFile = formData.get("markerImage") as File | null;
    const videoFile = formData.get("videoFile") as File | null;

    if (!title || !markerFile || !videoFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upload marker image to R2
    const markerFileName = `marker-${Date.now()}.png`;
    const markerBuffer = await markerFile.arrayBuffer();
    await uploadFile(`marker-images/${markerFileName}`, Buffer.from(markerBuffer), markerFile.type);

    // Upload video to R2
    const videoFileName = `video-${Date.now()}.mp4`;
    const videoBuffer = await videoFile.arrayBuffer();
    await uploadFile(`marker-videos/${videoFileName}`, Buffer.from(videoBuffer), videoFile.type);

    // Create marker object
    const newMarker = {
      id: Date.now().toString(),
      title,
      markerImageUrl: getPublicUrl(`marker-images/${markerFileName}`),
      videoUrl: getPublicUrl(`marker-videos/${videoFileName}`),
      createdAt: new Date().toISOString(),
    };

    // Add to in-memory storage
    markers.push(newMarker);

    return NextResponse.json(newMarker, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/markers error:", err);
    return NextResponse.json(
      { error: "Failed to create marker", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await request.json();
    markers = markers.filter(m => m.id !== id);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/markers error:", err);
    return NextResponse.json(
      { error: "Failed to delete marker", detail: String(err) },
      { status: 500 }
    );
  }
}