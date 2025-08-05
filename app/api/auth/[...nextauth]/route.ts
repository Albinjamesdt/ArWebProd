// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { comparePasswords } from "@/lib/auth-utils";

export const runtime = "edge";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // Environment variables
        const adminUser = process.env.NEXT_ADMIN_USERNAME;
        const storedHash = process.env.NEXT_ADMIN_PASSWORD_HASH;
        const storedSalt = process.env.NEXT_ADMIN_PASSWORD_SALT;
        const storedIterations = parseInt(
          process.env.NEXT_ADMIN_PASSWORD_ITERATIONS || "100000",
          10
        );

        // Validation
        if (!adminUser || !storedHash || !storedSalt || isNaN(storedIterations)) {
          console.error("Admin credentials not configured");
          return null;
        }

        // Compare username
        if (credentials.username !== adminUser) {
          return null;
        }

        try {
          const valid = await comparePasswords(
            credentials.password,
            storedHash,
            storedSalt,
            storedIterations
          );

          return valid ? { id: "1", name: adminUser, email: adminUser } : null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/admin",
    error: "/admin",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 60, // 30 minutes
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          name: token.name as string,
          email: token.email as string,
        };
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };