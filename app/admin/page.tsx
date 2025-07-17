// app\admin\page.tsx
"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // if you want to redirect away once signed in:
  useEffect(() => {
    if (status === "authenticated") {
         router.replace("/admin-panel");
    }
  }, [status]);
 
  if (status === "loading") {
    return <div>Loading…</div>;
  }

  if (!session) {
    // not signed in
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });
      if (res?.error) {
        setError(res.error);
      }else {
      router.replace("/admin-panel");
    }
    };

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit">Sign In</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

   
}
