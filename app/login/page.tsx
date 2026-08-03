"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Aman & Terpusat",
    description: "Data tersimpan dan dikelola dalam satu sistem."
  },
  {
    icon: UsersRound,
    title: "Akses Terpisah",
    description: "Hak akses disesuaikan dengan peran karyawan."
  },
  {
    icon: BarChart3,
    title: "Laporan Waktu Nyata",
    description: "Pantau aktivitas dan performa operasional."
  }
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const rememberRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const emailError = state?.fieldErrors?.email;
  const passwordError = state?.fieldErrors?.password;

  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
    const savedEmail = localStorage.getItem("pospintar_remember_email");
    if (savedEmail) {
      const frame = window.requestAnimationFrame(() => setEmail(savedEmail));
      if (rememberRef.current) rememberRef.current.checked = true;
      return () => window.cancelAnimationFrame(frame);
    }

    if (window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) {
      emailRef.current?.focus();
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    if (data.get("remember") === "true") {
      localStorage.setItem("pospintar_remember_email", email);
    } else {
      localStorage.removeItem("pospintar_remember_email");
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-white">
      <div className="grid h-full w-full overflow-hidden bg-white lg:grid-cols-[minmax(0,3fr)_minmax(400px,2fr)] xl:grid-cols-[minmax(0,8fr)_minmax(440px,5fr)]">
        <section className="relative hidden min-h-0 overflow-hidden bg-blue-50 px-10 py-8 text-slate-950 lg:flex lg:flex-col xl:px-12 xl:py-10 2xl:px-16 [@media(max-height:680px)]:py-5">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-8 top-0 h-full w-16 -skew-x-3 bg-blue-700" />
            <div className="absolute left-8 right-10 top-24 h-px bg-blue-200/70" />
            <div className="absolute left-12 top-28 h-32 w-32 rotate-12 border border-blue-200/60" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-blue-200 bg-white shadow-sm">
              <Image src="/icon.svg" alt="" width={28} height={28} priority />
            </div>
            <div>
              <p className="font-heading text-2xl font-bold leading-none text-blue-700">PosPintar</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Sistem Manajemen</p>
            </div>
          </div>

          <div className="relative z-10 grid min-h-0 flex-1 grid-cols-[minmax(250px,0.9fr)_minmax(0,1.1fr)] items-center gap-4 xl:gap-6">
            <div className="relative z-10 max-w-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Satu kendali, seluruh cabang</p>
              <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-slate-950 xl:text-5xl [@media(max-height:680px)]:text-3xl">
                Operasional cabang dalam satu sistem.
              </h1>
              <p className="mt-5 text-sm font-medium leading-6 text-slate-600 [@media(max-height:680px)]:mt-3">
                Kelola transaksi, MiniATM, service, stok, saldo, dan laporan dengan akses terpisah untuk setiap
                karyawan.
              </p>
            </div>

            <div aria-hidden="true" className="relative h-[min(46vh,360px)] min-h-56 w-full self-center pr-10">
              <Image
                src="/login-operations-transparent.webp"
                alt=""
                fill
                priority
                sizes="(min-width: 1280px) 420px, 34vw"
                className="object-contain"
              />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-blue-200 pt-5 [@media(max-height:680px)]:gap-3 [@media(max-height:680px)]:pt-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="min-w-0">
                <div className="flex items-center gap-2 text-blue-700">
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                </div>
                <p className="mt-1.5 text-[13px] leading-5 text-slate-500 [@media(max-height:560px)]:hidden">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 items-center justify-center overflow-y-auto border-l border-slate-200 bg-slate-50/70 p-5 sm:p-8 lg:p-6 xl:p-10 [@media(max-height:640px)]:py-3">
          <div className="w-full max-w-[440px]">
            <div className="mb-5 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-white shadow-sm">
                  <Image src="/icon.svg" alt="" width={26} height={26} priority />
                </div>
                <div>
                  <p className="font-heading text-2xl font-bold leading-none text-blue-700">PosPintar</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Sistem Manajemen</p>
                </div>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-blue-700 [@media(max-height:640px)]:mt-4">
                Satu kendali, seluruh cabang
              </p>
              <h1 className="mt-2 max-w-sm font-heading text-2xl font-bold leading-tight text-slate-950">
                Operasional cabang dalam satu sistem.
              </h1>
            </div>

            <div className="motion-safe:animate-fade-in-up bg-white sm:rounded-lg sm:border sm:border-slate-200 sm:p-8 sm:shadow-lg sm:shadow-slate-200/70 lg:p-8 [@media(max-height:640px)]:sm:p-6">
              <header className="mb-6 [@media(max-height:640px)]:mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Portal operasional</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950 sm:text-3xl">Masuk ke akun Anda</h2>
                <p className="mt-2 text-sm text-slate-500">Gunakan email dan kata sandi yang terdaftar.</p>
              </header>

              <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-4" aria-busy={pending}>
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      ref={emailRef}
                      id="login-email"
                      className="h-11 pl-10 transition-shadow autofill:shadow-[inset_0_0_0_1000px_#fff]"
                      name="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="email@pospintar.com"
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "login-email-error" : undefined}
                      required
                    />
                  </div>
                  {emailError ? (
                    <p id="login-email-error" role="alert" className="flex items-center gap-1.5 text-sm font-medium text-red-700">
                      <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {emailError}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Kata Sandi</Label>
                  <div className="relative">
                    <Lock aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="login-password"
                      className="h-11 px-10 transition-shadow autofill:shadow-[inset_0_0_0_1000px_#fff]"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="********"
                      minLength={6}
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? "login-password-error" : undefined}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError ? (
                    <p id="login-password-error" role="alert" className="flex items-center gap-1.5 text-sm font-medium text-red-700">
                      <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {passwordError}
                    </p>
                  ) : null}
                </div>

                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    ref={rememberRef}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    type="checkbox"
                    name="remember"
                    value="true"
                  />
                  Ingat email saya
                </label>

                {state?.error ? (
                  <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    {state.error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full text-base shadow-sm active:bg-blue-800 motion-reduce:transition-none"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                      Memeriksa...
                    </>
                  ) : (
                    <>
                      Masuk
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <footer className="mt-6 border-t border-slate-100 pt-4 text-center [@media(max-height:640px)]:mt-3 [@media(max-height:640px)]:pt-2">
                <p className="text-xs font-medium text-slate-500">Sistem internal PosPintar</p>
                <p className="mt-1 hidden text-xs text-slate-400 sm:block">Akses hanya untuk pengguna terdaftar.</p>
              </footer>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}