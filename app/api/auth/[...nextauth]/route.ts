// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

export const authOptions = {
    
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      
      async authorize(credentials) {
        const adminUser = {
          name: process.env.ADMIN_USERNAME!,
          hashedPassword: process.env.ADMIN_PASSWORD_HASH!,
        };

        if (!credentials?.username || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }
        const isUserValid = credentials.username === adminUser.name;
        const isPasswordValid = await compare(
          credentials.password,
          adminUser.hashedPassword
        );

        if (isUserValid && isPasswordValid) {
          return { id: "admin", name: adminUser.name };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn:    "/admin",            // your login page
    error:     "/admin?error=",     // catch-all for errors
  },
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,  
}; 

const handler = NextAuth(authOptions);

// re‑export for _all_ methods
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
