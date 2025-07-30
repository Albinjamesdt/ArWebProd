// app/admin-panel/page.tsx
'use client';

import { redirect, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPanelPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>; // Or a loading spinner
  }

  if (!session) {
    return null; // Will be redirected by the useEffect
  }

  return <AdminDashboard />;
}