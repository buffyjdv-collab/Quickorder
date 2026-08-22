import type { OrderStatus, PaymentMethod } from "./types";

export function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function formatCurrency(amount: number, currency = "₹"): string {
  return `${currency}${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ["received", "accepted", "preparing", "ready", "completed"];

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; emoji: string; color: string; bg: string; ring: string }> = {
  received:  { label: "Received",  emoji: "📝", color: "text-slate-700",  bg: "bg-slate-100",  ring: "ring-slate-200" },
  accepted:  { label: "Accepted",  emoji: "✅", color: "text-sky-700",    bg: "bg-sky-100",    ring: "ring-sky-200" },
  preparing: { label: "Preparing", emoji: "👨\u200d🍳", color: "text-amber-700",  bg: "bg-amber-100",  ring: "ring-amber-200" },
  ready:     { label: "Ready",     emoji: "🔔", color: "text-emerald-700", bg: "bg-emerald-100", ring: "ring-emerald-200" },
  completed: { label: "Completed", emoji: "🎉", color: "text-emerald-700", bg: "bg-emerald-100", ring: "ring-emerald-200" },
  cancelled: { label: "Cancelled", emoji: "❌", color: "text-red-700",    bg: "bg-red-100",    ring: "ring-red-200" },
};

export const PAYMENT_META: Record<PaymentMethod, { label: string; emoji: string; description: string }> = {
  cash:   { label: "Cash",   emoji: "💵", description: "Cash on pickup" },
  upi:    { label: "UPI",    emoji: "📱", description: "Pay via UPI" },
  card:   { label: "Card",   emoji: "💳", description: "Credit/Debit" },
  wallet: { label: "Wallet", emoji: "👛", description: "Digital wallet" },
};

export const COLOR_GRADIENTS: Record<string, string> = {
  emerald: "from-emerald-400 to-teal-500", amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-pink-500", violet: "from-violet-400 to-purple-500",
  sky: "from-sky-400 to-cyan-500", lime: "from-lime-400 to-green-500",
  orange: "from-orange-400 to-red-500", teal: "from-teal-400 to-emerald-500",
  red: "from-red-400 to-rose-500", green: "from-green-400 to-emerald-500",
  stone: "from-stone-400 to-zinc-500", yellow: "from-yellow-400 to-amber-500",
};

export function gradientFor(color: string): string {
  return COLOR_GRADIENTS[color] || COLOR_GRADIENTS.emerald;
}
