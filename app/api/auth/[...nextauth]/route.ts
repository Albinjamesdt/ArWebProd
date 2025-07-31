// // app/api/auth/[...nextauth]/route.ts
//  export const runtime = 'edge'
// import NextAuth from "next-auth";
// import type { AuthOptions, SessionStrategy } from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";

// export const getAuthOptions = (): AuthOptions => {
//   return {
//     providers: [
//       CredentialsProvider({
//         name: "Admin Login",
//         credentials: {
//           username: { label: "Username", type: "text" },
//           password: { label: "Password", type: "password" },
//         },
//         async authorize(credentials) {
//           // Dynamic import for server-only modules
//           const { compare } = await import('bcryptjs');
          
//           const adminUser = process.env.NEXT_ADMIN_USERNAME as string;
//           const adminHash = process.env.NEXT_ADMIN_PASSWORD_HASH as string;

//           if (!adminUser || !adminHash) {
//             console.error("Admin credentials not configured");
//             return null;
//           }

//           if (!credentials?.username || !credentials?.password) {
//             return null;
//           }

//           try {
//             const isUserValid = credentials.username === adminUser;
//             const isPasswordValid = await compare(credentials.password, adminHash);
            
//             return isUserValid && isPasswordValid 
//               ? { id: "admin", name: adminUser } 
//               : null;
//           } catch (error) {
//             console.error("Authentication error:", error);
//             return null;
//           }
//         },
//       }),
//     ],
//     pages: {
//       signIn: "/admin",
//       error: "/admin?error=",
//     },
//     session: { strategy: "jwt" },
//     secret: process.env.NEXTAUTH_SECRET,
//     debug: process.env.NODE_ENV !== 'production',
//   };
// }
// export const dynamic = 'force-dynamic';
// const handler = NextAuth(getAuthOptions());

// export { 
//   handler as GET, 
//   handler as POST, 
//   handler as PUT, 
//   handler as DELETE 
// };