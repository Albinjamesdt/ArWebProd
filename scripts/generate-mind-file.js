const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Cloudflare R2 configuration (S3-compatible)
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const R2_BUCKET = process.env.R2_BUCKET;

async function generateMindFile(
  imageFilePaths,
  outputFileName = "targets.mind"
) {
  console.log("🚀 Starting MindAR compilation process...");

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: false,
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
      // await page.screenshot({ path: "loading_indicator.png" });
    } catch (e) {
      console.log("ℹ️ Loading indicator not found, continuing...");
    }

    try {
      await page.waitForSelector("div.padding-vert--md>button", {
        visible: true,
        timeout: 120000, // 2 minutes timeout
      });
      console.log("✅ Compilation process completed");
    } catch (e) {
      console.log("⚠️ Loading indicator timeout, checking for completion...");
    }
    // await page.screenshot({ path: "loading_indicator_timeout.png" });

    // Wait for compile button to reappear (compilation finished)
    try {
      await page.waitForSelector(".button.button--primary.startButton_OY2G", {
        visible: true,
        timeout: 60000,
      });
      console.log("✅ Compilation finished, download ready");
      // await page.screenshot({ path: "download_ready.png" });

      // Click to download
      console.log("💾 Initiating download...");
      // await page.screenshot({ path: "download_started.png" });
      await page.click(".button.button--primary.startButton_OY2G");
      // await page.screenshot({ path: "download_ended.png" });
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

async function uploadToR2(filePath, fileName = "targets.mind") {
  try {
    console.log("☁️ Uploading to Cloudflare R2...");

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to R2 bucket
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
        Body: fileBuffer,
        ContentType: "application/octet-stream",
      }),
    );

    const publicUrl = `${process.env.R2_PUBLIC_ENDPOINT || process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileName}`;
    console.log("🔗 Public URL:", publicUrl);

    // Clean up local file
    fs.unlinkSync(filePath);
    console.log("🧹 Cleaned up local file");

    return {
      success: true,
      key: fileName,
      publicUrl,
    };
  } catch (error) {
    console.error("❌ Error uploading to R2:", error);
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
    const uploadResult = await uploadToR2(mindFilePath, "targets.mind");

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
