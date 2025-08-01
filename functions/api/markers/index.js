import formidable from "formidable";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "../../../lib/auth-options.js";
import { uploadFile, getPublicUrl } from "../../../lib/r2-client.js";

// disable Next’s body parser so we can handle multipart:
export const config = { api: { bodyParser: false } };

let inMemory = []; // replace with D1 if you want persistence

export default async function handler(req, res) {
  const session = await getServerSession({ req, ...getAuthOptions() });
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    return res.status(200).json(inMemory);
  }

  if (req.method === "POST") {
    const form = new formidable.IncomingForm({ multiples: true, uploadDir: "/tmp" });
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(400).json({ error: err.message });
      try {
        const title = fields.title;
        const markerFile = Array.isArray(files.markerImage)
          ? files.markerImage[0]
          : files.markerImage;
        const videoFile = Array.isArray(files.videoFile)
          ? files.videoFile[0]
          : files.videoFile;

        // upload to R2:
        const markerName = `marker-${Date.now()}.png`;
        await uploadFile(
          `marker-images/${markerName}`,
          require("fs").readFileSync(markerFile.filepath),
          markerFile.mimetype
        );

        const videoName = `video-${Date.now()}.mp4`;
        await uploadFile(
          `marker-videos/${videoName}`,
          require("fs").readFileSync(videoFile.filepath),
          videoFile.mimetype
        );

        const newMarker = {
          id: Date.now().toString(),
          title,
          markerImageUrl: getPublicUrl(`marker-images/${markerName}`),
          videoUrl: getPublicUrl(`marker-videos/${videoName}`),
          createdAt: new Date().toISOString(),
        };

        inMemory.push(newMarker);
        return res.status(201).json(newMarker);
      } catch (uploadErr) {
        console.error(uploadErr);
        return res.status(500).json({ error: uploadErr.message });
      }
    });
    return; // formidable does its own callback
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    inMemory = inMemory.filter((m) => m.id !== id);
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  res.status(405).end();
}
