// app/admin-panel/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import AdminDashboard from "@/components/AdminDashboard";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function AdminPanelPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
    }
  }, [status, router]);

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/admin',
      redirect: true 
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
        <h1 className="text-xl font-semibold">Admin Panel</h1>
        <div className="flex items-center gap-4">
          <span>Welcome, {session.user?.name}</span>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
      <AdminDashboard />
    </div>
  );
}