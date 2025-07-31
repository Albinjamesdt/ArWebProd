
// functions\api\auth\generate-nextauth.js
import NextAuth from "next-auth";
import { getAuthOptions } from "../../../lib/auth-options.js";

export default async function handler(req, res) {
  // NextAuth will dispatch GET/POST for you
  return NextAuth(req, res, getAuthOptions());
}
