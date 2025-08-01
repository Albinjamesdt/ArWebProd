// functions\api\markers\[id].js
import { getServerSession } from "next-auth";
import { getAuthOptions } from "../../../lib/auth-options.js";
import { uploadFile } from "../../../lib/r2-client.js"; // if you want to remove R2

export default async function handler(req, res) {
  const session = await getServerSession({ req, ...getAuthOptions() });
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).end();
  }

  const { id } = req.query;  // dynamic segment
  // TODO: also delete from R2 if you stored the path in D1
  // e.g. await env.BUCKET.delete(path)

  // For now just ack:
  return res.status(200).json({ success: true, id });
}

