"use client";

import { useEffect, useState } from "react";
import type { PostalCodeMatch } from "@/lib/thai-address";

export function usePostalCodeLookup(postalCode: string): PostalCodeMatch[] {
  const [result, setResult] = useState<{
    code: string;
    matches: PostalCodeMatch[];
  }>({ code: "", matches: [] });

  useEffect(() => {
    if (!/^[0-9]{5}$/.test(postalCode)) return;
    let cancelled = false;
    fetch(`/api/postal-code/${postalCode}`)
      .then((res) => res.json())
      .then((data: PostalCodeMatch[]) => {
        if (!cancelled) setResult({ code: postalCode, matches: data });
      });
    return () => {
      cancelled = true;
    };
  }, [postalCode]);

  return result.code === postalCode ? result.matches : [];
}
