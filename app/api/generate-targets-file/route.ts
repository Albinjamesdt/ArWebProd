// app\api\generate-targets-file\route.ts
import { type NextRequest, NextResponse } from "next/server";
import { uploadFile, deleteObject, listObjects, getPublicUrl } from "@/lib/r2-client";
import fs from "fs";
import path from "path";
import { generateMindFile } from "../../../scripts/generate-mind-file";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
    // Check if the request is multipart/form-data
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const markerImages = formData.getAll("markerImages") as File[];

    if (!markerImages || markerImages.length === 0) {
      return NextResponse.json(
        { success: false, message: "No marker images uploaded" },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const mindFiles: { marker: string; mindFileUrl: string }[] = [];

    // Prepare all files for processing
    const tempFiles: { tempImagePath: string; markerName: string; file: File }[] = [];

    for (const file of markerImages) {
      const tempImagePath = path.join(tempDir, `${Date.now()}-${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(tempImagePath, Buffer.from(arrayBuffer));
      const markerName = path.parse(file.name).name;
      tempFiles.push({ tempImagePath, markerName, file });
    }

    // delete any existing targets.mind file from R2 storage
    try {
      await deleteObject("targets.mind");
    } catch (_) {
      // ignore if not present
    }

    // Generate a single mind file from all marker images
    const tempImagePaths = tempFiles.map(f => f.tempImagePath);
    const mindFilePath = await generateMindFile(tempImagePaths, "targets.mind");

    // Upload the combined mind file
    const mindFileBuffer = fs.readFileSync(mindFilePath);
    await uploadFile("targets.mind", mindFileBuffer, "application/octet-stream");

    // Get public URL from R2
    const publicUrl = getPublicUrl("targets.mind");

    // Clean up temp files
    tempFiles.forEach(f => fs.unlinkSync(f.tempImagePath));
    fs.unlinkSync(mindFilePath);

    mindFiles.push({
      marker: "all",
      mindFileUrl: publicUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Targets files generated and uploaded successfully!",
      files: mindFiles,
      markersProcessed: mindFiles.length,
    });
  } catch (err: any) {
    console.error("Generate targets error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate targets",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Fetch all targets files from R2 storage
    const objects = await listObjects();
    const targetsFiles = objects.map(obj => ({
      name: obj.Key!,
      publicUrl: getPublicUrl(obj.Key!),
      updatedAt: obj.LastModified?.toISOString(),
    }));

    return NextResponse.json({ publicUrl: targetsFiles[0]?.publicUrl });
  } catch (err: any) {
    console.error("GET /api/generate-targets-file error:", err);
    return NextResponse.json(
      { error: "Failed to fetch targets files", detail: String(err) },
      { status: 500 }
    );
  }
  
}
 