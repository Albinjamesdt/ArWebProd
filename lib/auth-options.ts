// lib/auth-options.ts
import type { AuthOptions, SessionStrategy } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const getAuthOptions = (): AuthOptions => {
  const isBuild = process.env.npm_lifecycle_event === 'build';

  if (isBuild) {
    return {
      providers: [],
      secret: 'temp-secret-for-build',
      session: { strategy: 'jwt' as SessionStrategy },
      pages: { signIn: '/admin' },
    };
  }

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
          
          const adminUser = process.env.ADMIN_USERNAME;
          const adminHash = process.env.ADMIN_PASSWORD_HASH;

          if (!adminUser || !adminHash) {
            console.error("Admin credentials not configured");
            return null;
          }

          if (!credentials?.username || !credentials?.password) {
            return null;
          }

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
    secret: process.env.NEXTAUTH_SECRET || "default-secret-during-build",
    debug: process.env.NODE_ENV !== 'production',
  };
};