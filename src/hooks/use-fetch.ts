"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface FetchState<T> { data: T | null; loading: boolean; error: string | null; }

export function useFetch<T>(url: string | null, options?: { interval?: number }) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const urlRef = useRef(url); urlRef.current = url;
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!urlRef.current) { setState({ data: null, loading: false, error: null }); return; }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController(); abortRef.current = controller;
    setState(s => ({ ...s, loading: s.data === null, error: null }));
    try {
      const res = await fetch(urlRef.current, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as T;
      if (!controller.signal.aborted) setState({ data: json, loading: false, error: null });
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!controller.signal.aborted)
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : "Fetch failed" });
    }
  }, []);

  useEffect(() => { load(); if (options?.interval) { const id = setInterval(load, options.interval); return () => clearInterval(id); } }, [load, options?.interval]);
  return { ...state, refetch: load };
}