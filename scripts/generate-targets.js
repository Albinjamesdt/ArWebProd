// This script generates MindAR target files from uploaded markers
// Run this locally when markers are added/updated

import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getDB } from "../lib/cloudflare-client"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

async function downloadImage(url, filepath) {
  const response = await fetch(url)
  const buffer = await response.buffer()
  fs.writeFileSync(filepath, buffer)
}

async function getPublicUrl(bucket, key) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  // Generate a presigned URL that's valid for 1 hour
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return url
}

async function generateTargets() {
  try {
    console.log("Fetching markers from database...")

    // Get database instance
    const db = getDB(process.env)

    // Fetch all markers
    const { results: markers } = await db.prepare(
      "SELECT id, title, marker_image_path FROM markers ORDER BY created_at ASC"
    ).all()

    if (!markers || markers.length === 0) {
      console.log("No markers found")
      return
    }

    console.log(`Found ${markers.length} markers`)

    // Create temp directory
    const tempDir = path.join(process.cwd(), "temp-images")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Download all marker images
    const imagePaths = []
    for (const marker of markers) {
      const publicUrl = await getPublicUrl(
        process.env.R2_BUCKET_NAME || "marker-images",
        marker.marker_image_path
      )

      const filename = `marker-${marker.id}.jpg`
      const filepath = path.join(tempDir, filename)

      console.log(`Downloading ${marker.title}...`)
      await downloadImage(publicUrl, filepath)
      imagePaths.push(filepath)
    }

    console.log("All images downloaded")
    console.log("To generate targets.mind file:")
    console.log("1. Install MindAR CLI: npm install -g mindar-image-target-generator")
    console.log("2. Run: mindar-image-target-generator -i", imagePaths.join(" "), "-o public/targets.mind")
    console.log('3. Upload targets.mind to Cloudflare R2 bucket "targets"')

    // Note: The actual target generation requires the MindAR CLI tool
    // which needs to be installed separately and run manually
  } catch (error) {
    console.error("Error generating targets:", error)
    process.exit(1)
  }
}

generateTargets()
