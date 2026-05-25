"use client";

import { useActionState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.22),transparent_34rem),linear-gradient(135deg,#070b14_0%,#0b1220_48%,#111827_100%)] p-4 text-slate-100 sm:p-6">
      <div className="relative grid min-h-[min(720px,calc(100vh-3rem))] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="absolute inset-0 opacity-70 pointer-events-none">
          <div className="absolute -left-28 top-36 h-64 w-[46rem] -rotate-12 rounded-[50%] border border-blue-500/30 transition-transform duration-[10000ms] animate-pulse" />
          <div className="absolute -left-20 top-40 h-72 w-[50rem] -rotate-12 rounded-[50%] border border-blue-600/25 transition-transform duration-[12000ms] animate-pulse delay-150" />
          <div className="absolute -left-10 top-44 h-80 w-[54rem] -rotate-12 rounded-[50%] border border-cyan-500/15 transition-transform duration-[15000ms] animate-pulse delay-300" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_36%,rgba(37,99,235,0.28),transparent_22rem)]" />
        </div>

        <section className="relative flex min-h-[360px] flex-col justify-center px-8 py-10 sm:px-14 lg:px-20">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-400/40 bg-blue-600/20 text-2xl font-bold text-blue-200 shadow-[0_0_36px_rgba(37,99,235,0.32)]">
              A
            </div>
            <div>
              <p className="text-3xl font-bold leading-none">
                Adicom<span className="text-blue-400">99</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">Management System</p>
            </div>
          </div>

          <div className="mt-14 max-w-md">
            <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">
              Kelola inventori, transaksi, service, dan keuangan dalam satu sistem.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Solusi operasional internal untuk bisnis hardware, service perangkat, dan produk digital.
            </p>
          </div>

          <div className="mt-auto flex items-center gap-2 pt-10 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-blue-300" />
            <span>Aman, cepat, dan terpercaya</span>
          </div>
        </section>

        <section className="relative flex items-center justify-center border-t border-slate-800/50 bg-slate-900/30 p-5 sm:p-8 lg:border-l lg:border-t-0 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8 transition-transform hover:scale-[1.01] duration-500">
            <div>
              <h2 className="text-2xl font-semibold">Selamat datang kembali</h2>
              <p className="mt-2 text-sm text-slate-400">Masuk untuk melanjutkan ke akun Anda</p>
            </div>

            <form action={formAction} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400" />
                  <Input className="pl-10 h-11" name="email" type="email" placeholder="email@adicom99.com" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400" />
                  <Input className="pl-10 h-11" name="password" type="password" placeholder="••••••••" required />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <label className="flex items-center gap-2">
                  <input className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-blue-500" type="checkbox" />
                  Ingat saya
                </label>
                <span className="text-blue-400">Lupa password?</span>
              </div>
              {state?.error ? <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p> : null}
              <Button className="w-full h-11 text-base mt-2" disabled={pending}>
                {pending ? "Memeriksa..." : "Login"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
