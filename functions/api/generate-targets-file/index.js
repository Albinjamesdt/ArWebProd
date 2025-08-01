// this lives in your App-Router so the UI can fetch “/api/generate-targets-file”
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";

const NODE_FN = process.env.GENERATE_TARGETS_FN_URL; 
// e.g. https://webar-generate-targets.<your-deployment>.workers.dev

export async function POST(req) {
  const resp = await fetch(NODE_FN, {
    method: "POST",
    headers: { "content-type": req.headers.get("content-type") || "application/json" },
    body: req.body,
  });
  return NextResponse.json(await resp.json(), { status: resp.status });
}

export async function GET() {
  // simply return the public URL of the pre-generated targets.mind
  return NextResponse.json({
    publicUrl: `${process.env.R2_PUBLIC_ENDPOINT}/${process.env.R2_BUCKET}/targets.mind`,
  });
}
