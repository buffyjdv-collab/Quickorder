"use client";
import * as React from "react";

type ToastVariant = "default" | "destructive";
interface Toast { id: string; title?: string; description?: string; variant?: ToastVariant; }
interface ToastState { toasts: Toast[]; }

let count = 0;
function genId() { count++; return `toast-${count}`; }

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(state: ToastState) { memoryState = state; listeners.forEach((l) => l(state)); }

export function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {
  const id = genId();
  dispatch({ toasts: [...memoryState.toasts, { id, title, description, variant }] });
  setTimeout(() => { dispatch({ toasts: memoryState.toasts.filter((t) => t.id !== id) }); }, 4000);
  return id;
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);
  React.useEffect(() => { listeners.push(setState); return () => { const i = listeners.indexOf(setState); if (i > -1) listeners.splice(i, 1); }; }, [state]);
  return { ...state, toast, dismiss: (id: string) => { dispatch({ toasts: memoryState.toasts.filter((t) => t.id !== id) }); } };
}