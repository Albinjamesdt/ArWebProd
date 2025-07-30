// This script generates MindAR target files from uploaded markers
// Run this locally when markers are added/updated
 
import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import { createClient } from "@supabase/supabase-js"

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function downloadImage(url, filepath) {
  const response = await fetch(url)
  const buffer = await response.buffer()
  fs.writeFileSync(filepath, buffer)
}

async function generateTargets() {
  try {
    console.log("Fetching markers from Supabase...")

    // Fetch all markers
    const { data: markers, error } = await supabase
      .from("markers")
      .select("id, title, marker_image_path")
      .order("created_at", { ascending: true })

    if (error) throw error

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
      const publicUrl = supabase.storage.from("marker-images").getPublicUrl(marker.marker_image_path).data.publicUrl

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
    console.log('3. Upload targets.mind to Supabase Storage bucket "targets"')

    // Note: The actual target generation requires the MindAR CLI tool
    // which needs to be installed separately and run manually
  } catch (error) {
    console.error("Error generating targets:", error)
  }
}

generateTargets()
