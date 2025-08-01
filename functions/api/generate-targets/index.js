// functions\api\generate-targets\index.js
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const form = new formidable.IncomingForm({ multiples: true, uploadDir: "/tmp" });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      // launch headless Chrome
      const execPath = await chromium.executablePath;
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: execPath,
        headless: chromium.headless,
      });
      const page = await browser.newPage();

      // go to the MindAR compile UI
      await page.goto("https://hiukim.github.io/mind-ar-js-doc/tools/compile/", {
        waitUntil: "networkidle2",
      });

      // upload all files
      const imagePaths = [].concat(files.markerImages || []).map(f => f.filepath);
      await page.waitForSelector('input[type="file"]');
      await page.$eval('input[type="file"]', (el, paths) => {
        el.files = window.FileList.fromPaths(paths);
      }, imagePaths);

      // click compile & download
      await page.click(".startButton_OY2G");
      await page.waitForSelector(".button--primary.startButton_OY2G", { timeout: 120_000 });

      // enable downloads into /tmp
      await page._client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: "/tmp",
      });
      await page.click(".button--primary.startButton_OY2G");

      // wait for targets.mind in /tmp
      const out = "/tmp/targets.mind";
      await new Promise((r) => {
        const iv = setInterval(() => {
          if (fs.existsSync(out)) {
            clearInterval(iv);
            r(null);
          }
        }, 500);
      });

      await browser.close();

      // upload to R2
      const buf = fs.readFileSync(out);
      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: "targets.mind",
          Body: buf,
          ContentType: "application/octet-stream",
        })
      );

      // respond with public URL
      const publicUrl = `${process.env.R2_PUBLIC_ENDPOINT}/${BUCKET}/targets.mind`;
      return res.json({ success: true, publicUrl });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  });
}
