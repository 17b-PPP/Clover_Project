"use client";

import { useEffect, useState } from "react";
import type { MemberLookup } from "@/lib/types";

interface MemberLookupState {
  loading: boolean;
  error: string | null;
  data: MemberLookup | null;
}

interface MemberLookupResult {
  code: string;
  error: string | null;
  data: MemberLookup | null;
}

export function useMemberLookup(code: string): MemberLookupState {
  const trimmed = code.trim();
  const [result, setResult] = useState<MemberLookupResult>({
    code: "",
    error: null,
    data: null,
  });

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      fetch(`/api/withdrawals/lookup/${encodeURIComponent(trimmed)}`)
        .then(async (res) => {
          const body = await res.json();
          if (cancelled) return;
          if (!res.ok) {
            setResult({ code: trimmed, error: body.error, data: null });
            return;
          }
          setResult({ code: trimmed, error: null, data: body as MemberLookup });
        })
        .catch(() => {
          if (!cancelled) {
            setResult({
              code: trimmed,
              error: "ไม่สามารถค้นหาข้อมูลได้",
              data: null,
            });
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  if (!trimmed) return { loading: false, error: null, data: null };
  if (result.code !== trimmed) return { loading: true, error: null, data: null };
  return { loading: false, error: result.error, data: result.data };
}
