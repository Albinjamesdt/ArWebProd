// app/api/generate-targets-file/route.ts
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";

const NODE_FN = process.env.GENERATE_TARGETS_FN_URL!;  
// e.g. "https://webar-generate-targets.vercel.app/generate-targets-node"

export async function POST(req: NextRequest) {
  const resp = await fetch(NODE_FN, {
    method: "POST",
    headers: { "content-type": req.headers.get("content-type")! },
    body: req.body,
  });
  return NextResponse.json(await resp.json(), { status: resp.status });
}

export async function GET() {
  // just return the static public URL
  return NextResponse.json({
    publicUrl: `${process.env.R2_PUBLIC_ENDPOINT}/${process.env.R2_BUCKET}/targets.mind`,
  });
}
