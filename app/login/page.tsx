"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

function sanitizeNext(rawNext: string | null, fallback: string): string {
  if (!rawNext) return fallback;
  try {
    const url = new URL(rawNext, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    const path = url.pathname + url.search + url.hash;
    // Re-validate the OUTPUT: a same-origin parse can still yield a pathname
    // that is itself protocol-relative (e.g. "//evil.com"), which the router
    // would hard-navigate off-site. Requiring `path` to re-resolve to the same
    // origin AND to be a fixed point of the parser closes that whole class.
    const recheck = new URL(path, window.location.origin);
    if (recheck.origin !== window.location.origin) return fallback;
    if (recheck.pathname + recheck.search + recheck.hash !== path) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
      const next = sanitizeNext(searchParams.get("next"), "/");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-700 text-base font-bold text-white">
            FL
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            เข้าสู่ระบบ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            สหกรณ์กองทุนสวนยางบ้านบางบอน
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อผู้ใช้งาน"
            required
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <PasswordInput
            label="รหัสผ่าน"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full justify-center"
          >
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
