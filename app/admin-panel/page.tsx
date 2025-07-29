// app/admin-panel/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route" 
import AdminDashboard from "@/components/AdminDashboard"
 
export const runtime = 'edge';
export default async function AdminPanelPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    // no session → bounce to login
    redirect("/admin")
  }
  // session exists → render your client panel
  return <AdminDashboard /> 
}