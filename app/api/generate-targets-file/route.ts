import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseClient } from "@/lib/supabase-client";
import fs from "fs";
import path from "path";
import { generateMindFile } from "../../../scripts/generate-mind-file";

export async function POST(request: NextRequest) {
  try {
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

    const mindFiles: { marker: string; mindFileUrl: string; uploadPath: string }[] = [];

    // Prepare all files for processing
    const tempFiles: { tempImagePath: string; markerName: string; file: File }[] = [];

    for (const file of markerImages) {
      const tempImagePath = path.join(tempDir, `${Date.now()}-${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(tempImagePath, Buffer.from(arrayBuffer));
      const markerName = path.parse(file.name).name;
      tempFiles.push({ tempImagePath, markerName, file });
    }

    // delete any existing targets.mind file from supabase storage
    const { data: existingFiles, error: listError } = await supabaseAdmin.storage
      .from("targets")
      .list("", {
        limit: 1,
        offset: 0,
        sortBy: { column: "name", order: "desc" },
      });

    if (listError) {
      throw new Error(`Supabase list error: ${listError.message}`);
    } 

    if (existingFiles.length > 0) {
      const existingFileName = existingFiles[0].name;
      const { error: deleteError } = await supabaseAdmin.storage
        .from("targets")
        .remove([existingFileName]);
      if (deleteError) {
        throw new Error(`Supabase delete error: ${deleteError.message}`);
      }
    }

    // Generate a single mind file from all marker images
    const tempImagePaths = tempFiles.map(f => f.tempImagePath);
    const mindFilePath = await generateMindFile(tempImagePaths, "targets.mind");

    // Upload the combined mind file
    const mindFileBuffer = fs.readFileSync(mindFilePath);
    const { data: uploadData, error: uploadError } =
      await supabaseAdmin.storage
      .from("targets")
      .upload("targets.mind", mindFileBuffer, {
        contentType: "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      // Clean up temp files before throwing
      tempFiles.forEach(f => fs.unlinkSync(f.tempImagePath));
      fs.unlinkSync(mindFilePath);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from("targets")
      .getPublicUrl("targets.mind");

    // Clean up temp files
    tempFiles.forEach(f => fs.unlinkSync(f.tempImagePath));
    fs.unlinkSync(mindFilePath);

    mindFiles.push({
      marker: "all",
      mindFileUrl: publicUrlData.publicUrl,
      uploadPath: uploadData.path,
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
    // Fetch all targets files from Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from("targets")
      .list("", {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "desc" },
      });

    if (error) {
      throw error;
    }

    const targetsFiles = data.map((file) => ({
      name: file.name,
      publicUrl: supabaseClient.storage.from("targets").getPublicUrl(file.name)
        .data.publicUrl,
      updatedAt: file.updated_at,
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
