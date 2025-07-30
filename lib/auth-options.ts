// lib/auth-options.ts
import type { AuthOptions, SessionStrategy } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const getAuthOptions = (): AuthOptions => {
  return {
    providers: [
      CredentialsProvider({
        name: "Admin Login",
        credentials: {
          username: { label: "Username", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          // Dynamic import for server-only modules
          const { compare } = await import('bcryptjs');
          
          const adminUser = process.env.NEXT_ADMIN_USERNAME as string;
          const adminHash = process.env.NEXT_ADMIN_PASSWORD_HASH as string;

          if (!adminUser || !adminHash) {
            console.error("Admin credentials not configured");
            return null;
          }

          if (!credentials?.username || !credentials?.password) {
            return null;
          }
          console.log("a--------------------------------",adminHash)
          try {
            const isUserValid = credentials.username === adminUser;
            const isPasswordValid = await compare(credentials.password, adminHash);
            
            return isUserValid && isPasswordValid 
              ? { id: "admin", name: adminUser } 
              : null;
          } catch (error) {
            console.error("Authentication error:", error);
            return null;
          }
        },
      }),
    ],
    pages: {
      signIn: "/admin",
      error: "/admin?error=",
    },
    session: { strategy: "jwt" },
    secret: process.env.NEXT_AUTH_SECRET || "default-secret-during-build",
    debug: process.env.NODE_ENV !== 'production',
  };
};