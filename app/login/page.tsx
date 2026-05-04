"use client";

import { useActionState } from "react";
import { Wrench } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Wrench className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Adicom99 Management System</CardTitle>
          <p className="text-sm text-slate-500">Masuk untuk mengelola inventory, transaksi, service, dan keuangan.</p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="admin@adicom99.com" required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input name="password" type="password" placeholder="••••••••" required />
            </div>
            {state?.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p> : null}
            <Button className="w-full" disabled={pending}>
              {pending ? "Memeriksa..." : "Login"}
            </Button>
            <p className="text-xs text-slate-500">Seed awal: admin@adicom99.com / password123</p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
