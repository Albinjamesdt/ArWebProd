// functions/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import { getAuthOptions } from "../../../lib/auth-options.js";

// If you’re on Vercel you can optionally export this to force Node runtime
export const dynamic = 'force-dynamic';


export default async function handler(req, res) {
  // Delegate everything to NextAuth
  return NextAuth(req, res, getAuthOptions());
}
