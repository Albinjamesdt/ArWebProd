const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fydrjniligfkxnpahzto.supabase.co";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZHJqbmlsaWdma3hucGFoenRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc0OTMxMSwiZXhwIjoyMDY2MzI1MzExfQ.Hw7dDFIbO67rxqnBxPb9IY2-TismvIKzjhB_jfOibo0";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateMindFile(
  imageFilePaths,
  outputFileName = "targets.mind"
) {
  console.log("🚀 Starting MindAR compilation process...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const downloadPath = process.cwd();

  // Set up download behavior
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadPath,
  });

  try {
    // Go to the compiler tool
    console.log("📡 Navigating to MindAR compiler...");
    await page.goto("https://hiukim.github.io/mind-ar-js-doc/tools/compile/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Upload all images
    console.log("📤 Uploading images...");
    const input = await page.waitForSelector('input[type="file"]', {
      timeout: 10000,
    });
    await input.uploadFile(...imageFilePaths);
    console.log("✅ Images uploaded successfully");

    // Click compile button
    console.log("⚙️ Starting compilation...");
    await page.click(".startButton_OY2G");
    console.log("✅ Compile button clicked");

    // Wait for compilation to start (button disappears)
    try {
      await page.waitForSelector(".startButton_OY2G", {
        hidden: true,
        timeout: 60000,
      });
      console.log("✅ Compilation started");
    } catch (e) {
      console.log("⚠️ Compile button did not disappear, continuing...");
    }

    // Wait for loading indicator
    try {
      await page.waitForSelector("div.padding-vert--md>div", {
        timeout: 10000,
      });
      console.log("✅ Loading indicator appeared");
    } catch (e) {
      console.log("ℹ️ Loading indicator not found, continuing...");
    }

    try {
      await page.waitForSelector("div.padding-vert--md>div", {
        hidden: true,
        timeout: 120000, // 2 minutes timeout
      });
      console.log("✅ Compilation process completed");
    } catch (e) {
      console.log("⚠️ Loading indicator timeout, checking for completion...");
    }

    // Wait for compile button to reappear (compilation finished)
    try {
      await page.waitForSelector(".startButton_OY2G", {
        visible: true,
        timeout: 60000,
      });
      console.log("✅ Compilation finished, download ready");

      // Click to download
      console.log("💾 Initiating download...");
      await page.click(".startButton_OY2G");

      // Wait for download to complete
      const downloadFile = path.join(downloadPath, outputFileName);
      const tempDownloadFile = downloadFile + ".crdownload";

      function waitForDownload() {
        return new Promise((resolve, reject) => {
          const interval = setInterval(() => {
            console.log("🔍 Checking for download completion...");
            if (
              fs.existsSync(downloadFile) &&
              !fs.existsSync(tempDownloadFile)
            ) {
              clearInterval(interval);
              clearTimeout(timeout);
              resolve(downloadFile);
            }
          }, 1000);

          // Timeout after 3 minutes
          const timeout = setTimeout(() => {
            clearInterval(interval);
            reject(new Error("Download timed out after 3 minutes"));
          }, 180000);
        });
      }

      console.log("⏳ Waiting for download to complete...");
      const finalPath = await waitForDownload();
      console.log("✅ Download completed:", finalPath);

      return finalPath;
    } catch (e) {
      throw new Error(`Compilation failed: ${e.message}`);
    }
  } catch (error) {
    console.error("❌ Error during compilation:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function uploadToSupabase(filePath, fileName = "targets.mind") {
  try {
    console.log("☁️ Uploading to Supabase...");

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("targets")
      .upload(fileName, fileBuffer, {
        contentType: "application/octet-stream",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    console.log("✅ Successfully uploaded to Supabase:", data.path);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("targets")
      .getPublicUrl(fileName);

    console.log("🔗 Public URL:", publicUrlData.publicUrl);

    // Clean up local file
    fs.unlinkSync(filePath);
    console.log("🧹 Cleaned up local file");

    return {
      success: true,
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error("❌ Error uploading to Supabase:", error);
    throw error;
  }
}

async function processMarkersAndGenerateTargets() {
  try {
    console.log("🎯 Starting marker processing...");

    // Fetch all markers from database
    const { data: markers, error } = await supabase
      .from("markers")
      .select("id, title, marker_image_path")
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!markers || markers.length === 0) {
      console.log("ℹ️ No markers found in database");
      return { success: false, message: "No markers found" };
    }

    console.log(`📊 Found ${markers.length} markers to process`);

    // Download first marker image for compilation
    const firstMarker = markers[0];
    const { data: publicUrlData } = supabase.storage
      .from("marker-images")
      .getPublicUrl(firstMarker.marker_image_path);

    const imageUrl = publicUrlData.publicUrl;
    console.log("🖼️ Processing marker image:", firstMarker.title);

    // Download image locally
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const tempImagePath = path.join(process.cwd(), "temp-marker.jpg");
    fs.writeFileSync(tempImagePath, Buffer.from(imageBuffer));

    // Generate .mind file
    const mindFilePath = await generateMindFile(tempImagePath, "targets.mind");

    // Upload to Supabase
    const uploadResult = await uploadToSupabase(mindFilePath, "targets.mind");

    // Clean up temp image
    fs.unlinkSync(tempImagePath);

    console.log("🎉 Process completed successfully!");
    return {
      success: true,
      markersProcessed: markers.length,
      targetFile: uploadResult.publicUrl,
      message: "Targets file generated and uploaded successfully",
    };
  } catch (error) {
    console.error("❌ Process failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export functions for use in API routes
module.exports = {
  generateMindFile,
  uploadToSupabase,
  processMarkersAndGenerateTargets,
};

// If run directly
if (require.main === module) {
  processMarkersAndGenerateTargets()
    .then((result) => {
      console.log("Final result:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}
