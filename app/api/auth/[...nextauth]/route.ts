// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth-options";

export const dynamic = 'force-dynamic';
const handler = NextAuth(getAuthOptions());

export { 
  handler as GET, 
  handler as POST, 
  handler as PUT, 
  handler as DELETE 
};