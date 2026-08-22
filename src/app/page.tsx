'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import {
  ArrowDown, ArrowUp, BarChart3, Calendar, ChevronDown, ChevronRight,
  Clock, DollarSign, LayoutDashboard, ListOrdered, LogOut, Menu as MenuIcon,
  Package, QrCode, RefreshCw, Search, ShoppingBag, TrendingUp, UtensilsCrossed, X,
} from 'lucide-react';

import { useFetch } from '@/hooks/use-fetch';
import { formatCurrency, formatTimeAgo, ORDER_STATUS_FLOW, ORDER_STATUS_META, PAYMENT_META, gradientFor, formatDate } from '@/lib/format';
import type { Analytics, Business, Category, Order, OrderStatus, PaymentMethod, RevenueDetail, Table as TableType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSession, signIn, signOut } from 'next-auth/react';

// ─── Types ────────────────────────────────────────────────────────────
type Section = 'overview' | 'orders' | 'menu' | 'qr' | 'revenue';

const NAV_ITEMS: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'orders',   label: 'Orders',   icon: ListOrdered },
  { key: 'menu',     label: 'Menu',     icon: MenuIcon },
  { key: 'qr',       label: 'QR Codes', icon: QrCode },
  { key: 'revenue',  label: 'Revenue',  icon: DollarSign },
];

const STATUS_HEX: Record<string, string> = {
  received: '#64748b', accepted: '#0284c7', preparing: '#d97706', ready: '#10b981', completed: '#059669', cancelled: '#dc2626',
};
const PAYMENT_HEX: Record<PaymentMethod, string> = { cash: '#10b981', upi: '#f59e0b', card: '#8b5cf6', wallet: '#0ea5e9' };

const CAT_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6', '#f97316'];

// ─── Stat Card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string;
  accent: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
}) {
  const m: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-600 ring-amber-200',
    rose: 'bg-rose-50 text-rose-600 ring-rose-200',
    sky: 'bg-sky-50 text-sky-600 ring-sky-200',
    violet: 'bg-violet-50 text-violet-600 ring-violet-200',
  };
  return (
    <Card className='overflow-hidden transition-shadow hover:shadow-md'>
      <CardHeader className='flex flex-row items-start justify-between gap-2 pb-2'>
        <div className='space-y-1 min-w-0'>
          <CardDescription className='text-xs uppercase tracking-wide'>{label}</CardDescription>
          <CardTitle className='text-xl font-bold tabular-nums sm:text-2xl lg:text-3xl truncate'>{value}</CardTitle>
        </div>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 sm:size-10', m[accent])}>
          <Icon className='size-4 sm:size-5' />
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <p className='text-[11px] sm:text-xs text-muted-foreground'>{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────
function OverviewSection({ business, analytics }: { business: Business | null; analytics: AnalyticsResponse | null }) {
  const d = analytics;
  const currency = business?.currency || '₹';
  const revenueConfig: ChartConfig = { revenue: { label: 'Revenue', color: '#10b981' } };
  const paymentData = (d?.paymentBreakdown || []).map(p => ({ ...p, fill: PAYMENT_HEX[p.method as PaymentMethod] || '#94a3b8' }));

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Stats grid - 2 cols mobile, 4 cols desktop */}
      <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
        {d ? <>
          <StatCard icon={DollarSign} label='Revenue' value={formatCurrency(d.totalRevenue, currency)} sub={`${d.completedOrders} completed`} accent='emerald' />
          <StatCard icon={ShoppingBag} label='Orders' value={String(d.totalOrders)} sub={`${d.cancelledOrders} cancelled`} accent='amber' />
          <StatCard icon={TrendingUp} label='Avg Order' value={formatCurrency(d.avgOrderValue, currency)} sub='per completed order' accent='sky' />
          <StatCard icon={RefreshCw} label='Active' value={String(d.activeOrders)} sub='in kitchen now' accent='rose' />
        </> : Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardHeader className='pb-2'><Skeleton className='h-3 w-16' /><Skeleton className='h-8 w-24' /></CardHeader><CardContent><Skeleton className='h-3 w-20' /></CardContent></Card>)}
      </div>

      {/* Charts - stacked mobile, side-by-side desktop */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        {/* Revenue chart */}
        <Card className='lg:col-span-2'>
          <CardHeader className='pb-2 sm:pb-4'>
            <CardTitle className='flex items-center gap-2 text-sm sm:text-base'><span className='text-base sm:text-lg'>📈</span> Revenue · Last 7 days</CardTitle>
            <CardDescription className='text-xs'>Daily revenue from completed orders</CardDescription>
          </CardHeader>
          <CardContent>
            {d ? <ChartContainer config={revenueConfig} className='h-[200px] sm:h-[240px] w-full'>
              <AreaChart data={d.revenueByDay} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                <defs><linearGradient id='revFill' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor='#10b981' stopOpacity={0.35} /><stop offset='95%' stopColor='#10b981' stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey='day' tickLine={false} axisLine={false} fontSize={11} stroke='#94a3b8' />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke='#94a3b8' width={45} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => <span className='font-mono font-medium'>{formatCurrency(Number(value), currency)}</span>} />} />
                <Area type='monotone' dataKey='revenue' stroke='#10b981' strokeWidth={2.5} fill='url(#revFill)' dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ChartContainer> : <div className='flex h-[200px] items-end gap-2'>{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className='flex-1' style={{ height: `${40 + (i % 3) * 30}px` }} />)}</div>}
          </CardContent>
        </Card>

        {/* Payment pie */}
        <Card>
          <CardHeader className='pb-2 sm:pb-4'>
            <CardTitle className='flex items-center gap-2 text-sm sm:text-base'><span className='text-base sm:text-lg'>💳</span> Payments</CardTitle>
            <CardDescription className='text-xs'>Completed orders by method</CardDescription>
          </CardHeader>
          <CardContent>
            {d ? paymentData.length === 0 ? <p className='py-10 text-center text-sm text-muted-foreground'>No payments yet</p> : (
              <div className='flex flex-col items-center gap-3'>
                <ChartContainer config={{ count: { label: 'Orders', color: '#10b981' } }} className='mx-auto aspect-square h-[140px] sm:h-[160px]'>
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey='count' />} />
                    <Pie data={paymentData} dataKey='count' nameKey='method' innerRadius={35} outerRadius={60} paddingAngle={2} strokeWidth={2}>
                      {paymentData.map((e) => <Cell key={e.method} fill={e.fill} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className='grid w-full grid-cols-2 gap-1.5 text-xs'>
                  {paymentData.map(p => { const meta = PAYMENT_META[p.method as PaymentMethod]; return (
                    <li key={p.method} className='flex items-center justify-between rounded-md bg-muted/40 px-2 py-1'>
                      <span className='flex items-center gap-1.5'><span className='size-2.5 rounded-full' style={{ background: p.fill }} />{meta?.emoji} {meta?.label}</span>
                      <span className='font-mono font-medium tabular-nums'>{p.count}</span>
                    </li>); })}
                </ul>
              </div>
            ) : <div className='flex h-[160px] items-center justify-center'><Skeleton className='size-32 rounded-full' /></div>}
          </CardContent>
        </Card>
      </div>

      {/* Status + Top products - side by side on desktop */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader className='pb-2'><CardTitle className='text-sm sm:text-base'>🗂️ Orders by Status</CardTitle></CardHeader>
          <CardContent className='space-y-2'>
            {d ? (d.ordersByStatus || []).map(s => {
              const meta = ORDER_STATUS_META[s.status as OrderStatus];
              const max = Math.max(...(d?.ordersByStatus || []).map(x => x.count), 1);
              return (<div key={s.status} className='space-y-1'>
                <div className='flex items-center justify-between text-xs'><span className='flex items-center gap-1.5'><span>{meta?.emoji}</span><span className='font-medium'>{meta?.label}</span></span><span className='font-mono tabular-nums text-muted-foreground'>{s.count}</span></div>
                <div className='h-2 w-full overflow-hidden rounded-full bg-muted'><div className='h-full rounded-full transition-all' style={{ width: `${(s.count / max) * 100}%`, background: STATUS_HEX[s.status] || '#94a3b8' }} /></div>
              </div>);
            }) : Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-8 w-full' />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'><CardTitle className='text-sm sm:text-base'>🏆 Top Products</CardTitle></CardHeader>
          <CardContent>
            {d ? (d.topProducts || []).length === 0 ? <p className='py-6 text-center text-sm text-muted-foreground'>No sales yet</p> : (
              <ScrollArea className='max-h-[220px]'>
                <ol className='space-y-1.5'>
                  {(d.topProducts || []).map((p, idx) => (
                    <li key={p.name} className='flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent/40'>
                      <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground')}>{idx + 1}</span>
                      <span className='text-base sm:text-lg'>{p.emoji}</span>
                      <div className='min-w-0 flex-1'><p className='truncate text-xs sm:text-sm font-medium'>{p.name}</p><p className='text-[10px] sm:text-xs text-muted-foreground'>{p.count} sold</p></div>
                      <span className='font-mono text-xs sm:text-sm font-semibold tabular-nums text-emerald-700'>{formatCurrency(p.revenue, currency)}</span>
                    </li>))}
                </ol>
              </ScrollArea>
            ) : <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-9 w-full' />)}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Orders Section ───────────────────────────────────────────────────
function OrdersSection({ orders }: { orders: Order[] }) {
  const [search, setSearch] = React.useState('');
  const [activeOnly, setActiveOnly] = React.useState(false);
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (activeOnly && (o.status === 'completed' || o.status === 'cancelled')) return false;
      if (!q) return true;
      return String(o.orderNumber).includes(q) || (o.tableCode || '').toLowerCase().includes(q) || (o.customerName || '').toLowerCase().includes(q);
    });
  }, [orders, search, activeOnly]);

  const byStatus = React.useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const s of ORDER_STATUS_FLOW) map[s] = [];
    for (const o of filtered) { if (map[o.status]) map[o.status].push(o); }
    return map;
  }, [filtered]);

  return (
    <div className='space-y-3'>
      {/* Search bar */}
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative flex-1 min-w-[180px]'>
          <Search className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input placeholder='Search order #, table…' value={search} onChange={e => setSearch(e.target.value)} className='pl-8 h-9 text-sm' />
        </div>
        <Badge variant={activeOnly ? 'default' : 'secondary'} className='cursor-pointer h-8 gap-1.5 px-3 select-none' onClick={() => setActiveOnly(!activeOnly)}>
          {activeOnly ? 'All' : 'Active'} · {filtered.length}
        </Badge>
      </div>

      {/* Desktop: Kanban columns */}
      <div className='hidden lg:block'>
        <div className='flex gap-3 overflow-x-auto pb-2'>
          {ORDER_STATUS_FLOW.map(status => {
            const meta = ORDER_STATUS_META[status];
            const cols = byStatus[status] || [];
            return (
              <div key={status} className='flex min-w-[260px] flex-1 flex-col gap-2'>
                <div className={cn('sticky top-0 z-10 flex items-center justify-between rounded-lg px-3 py-2 ring-1', meta.bg, meta.ring)}>
                  <span className='flex items-center gap-2 text-sm font-semibold'><span>{meta.emoji}</span>{meta.label}</span>
                  <Badge variant='secondary' className={cn('bg-white/70 tabular-nums', meta.color)}>{cols.length}</Badge>
                </div>
                <ScrollArea className='max-h-[calc(100vh-280px)]'>
                  <div className='space-y-2 pr-1'>
                    {cols.length === 0 ? <div className='flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground'>No orders</div> : cols.map(o => <OrderCard key={o.id} order={o} />)}
                  </div>
                </ScrollArea>
              </div>);
          })}
        </div>
      </div>

      {/* Mobile: List view grouped by status */}
      <div className='lg:hidden space-y-4'>
        {ORDER_STATUS_FLOW.map(status => {
          const meta = ORDER_STATUS_META[status];
          const cols = byStatus[status] || [];
          if (cols.length === 0) return null;
          return (
            <div key={status}>
              <div className={cn('flex items-center justify-between rounded-lg px-3 py-2 mb-2 ring-1', meta.bg, meta.ring)}>
                <span className='flex items-center gap-2 text-sm font-semibold'><span>{meta.emoji}</span>{meta.label}</span>
                <Badge variant='secondary' className={cn('bg-white/70 tabular-nums', meta.color)}>{cols.length}</Badge>
              </div>
              <div className='space-y-2'>{cols.map(o => <OrderCard key={o.id} order={o} compact />)}</div>
            </div>);
        })}
      </div>
    </div>
  );
}

function OrderCard({ order, compact }: { order: Order; compact?: boolean }) {
  const meta = ORDER_STATUS_META[order.status];
  const payMeta = PAYMENT_META[order.paymentMethod];
  return (
    <Card className={cn('shadow-sm transition-shadow hover:shadow-md border-l-4', meta.ring.replace('ring-', 'border-l-'))}>
      <CardContent className='p-3 space-y-2'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='font-mono text-sm font-bold'>#{order.orderNumber}</span>
              {order.tableCode ? <Badge variant='secondary' className='bg-emerald-50 text-emerald-700 text-[10px]'>🪑 {order.tableCode}</Badge> : <Badge variant='secondary' className='text-[10px]'>🥡 Counter</Badge>}
              <Badge className={cn('text-[10px]', meta.bg, meta.color)}>{meta.label}</Badge>
            </div>
            <p className='mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground'><Clock className='size-3' />{formatTimeAgo(order.createdAt)}</p>
          </div>
          <div className='text-right shrink-0'>
            <p className='font-mono text-sm font-bold tabular-nums'>₹{order.total.toLocaleString()}</p>
            <p className='text-[10px] text-muted-foreground'>{payMeta.emoji} {payMeta.label}</p>
          </div>
        </div>
        {!compact && order.items.length > 0 && (
          <div className='max-h-[120px] space-y-1 overflow-y-auto rounded-md bg-muted/30 p-2'>
            {order.items.map(it => (
              <div key={it.id} className='flex items-center gap-2 text-xs'>
                <span>{it.productEmoji}</span>
                <span className='flex-1 truncate'>{it.productName}</span>
                <span className='text-muted-foreground'>×{it.quantity}</span>
                <span className='font-mono tabular-nums'>₹{it.totalPrice}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Menu Section ─────────────────────────────────────────────────────
function MenuSection({ categories }: { categories: Category[] | null }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  if (!categories) return <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-40 w-full rounded-2xl' />)}</div>;

  return (
    <div className='space-y-4'>
      {categories.map(cat => {
        const isOpen = expanded === cat.id;
        return (
          <Collapsible key={cat.id} open={isOpen} onOpenChange={(v) => setExpanded(v ? cat.id : null)}>
            <CollapsibleTrigger asChild>
              <button className='flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-left transition-colors hover:from-emerald-100 hover:to-teal-100 ring-1 ring-emerald-200'>
                <div className='flex items-center gap-3'>
                  <span className='flex size-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-emerald-200'>{cat.emoji || '🍽️'}</span>
                  <div><p className='font-bold text-sm sm:text-base'>{cat.name}</p><p className='text-xs text-muted-foreground'>{cat.products?.length || 0} items</p></div>
                </div>
                <ChevronDown className={cn('size-5 text-emerald-600 transition-transform', isOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3'>
                {(cat.products || []).map(p => (
                  <Card key={p.id} className='overflow-hidden transition-shadow hover:shadow-md'>
                    <div className={cn('h-20 sm:h-24 bg-gradient-to-br flex items-center justify-center', gradientFor(p.imageColor))}>
                      <span className='text-3xl sm:text-4xl drop-shadow-md'>{p.emoji}</span>
                    </div>
                    <CardContent className='p-3'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'><p className='font-semibold text-sm truncate'>{p.name}</p><p className='text-[11px] text-muted-foreground mt-0.5 line-clamp-1'>{p.description}</p></div>
                        <span className='font-mono text-sm font-bold text-emerald-700 shrink-0'>₹{p.price}</span>
                      </div>
                      <div className='flex items-center gap-2 mt-2'>
                        {p.popular && <Badge className='bg-amber-100 text-amber-700 text-[10px]'>Popular</Badge>}
                        <span className='text-[10px] text-muted-foreground'>⏱ {p.prepTime}min</span>
                        {!p.available && <Badge variant='secondary' className='text-[10px] bg-red-50 text-red-600'>Unavailable</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>);
      })}
    </div>
  );
}

// ─── QR Section ───────────────────────────────────────────────────────
function QrSection({ tables }: { tables: TableType[] | null }) {
  if (!tables) return <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-48 w-full rounded-2xl' />)}</div>;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>{tables.length} tables configured</p>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {tables.map(t => (
          <Card key={t.id} className={cn('overflow-hidden transition-shadow hover:shadow-md', !t.active && 'opacity-60')}>
            <div className={cn('flex items-center gap-3 p-4', t.active ? 'bg-gradient-to-r from-emerald-50 to-teal-50' : 'bg-muted/50')}>
              <div className={cn('flex size-12 items-center justify-center rounded-xl text-2xl ring-1', t.active ? 'bg-white ring-emerald-200 shadow-sm' : 'bg-muted ring-muted-foreground/20')}>
                {t.active ? '📱' : '🚫'}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='font-semibold text-sm truncate'>{t.name}</p>
                <p className='text-xs text-muted-foreground'>Code: <span className='font-mono font-medium'>{t.code}</span></p>
              </div>
              <Badge variant={t.active ? 'default' : 'secondary'} className={t.active ? 'bg-emerald-600' : ''}>{t.active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <CardContent className='p-4 space-y-2'>
              <div className='grid grid-cols-3 gap-2 text-center'>
                <div className='rounded-lg bg-muted/40 p-2'><p className='text-xs text-muted-foreground'>Zone</p><p className='text-sm font-semibold mt-0.5'>{t.zone || '—'}</p></div>
                <div className='rounded-lg bg-muted/40 p-2'><p className='text-xs text-muted-foreground'>Seats</p><p className='text-sm font-semibold mt-0.5'>{t.capacity}</p></div>
                <div className='rounded-lg bg-muted/40 p-2'><p className='text-xs text-muted-foreground'>Scans</p><p className='text-sm font-semibold mt-0.5'>{t.scans}</p></div>
              </div>
              {/* QR placeholder */}
              <div className='flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-4'>
                <div className='text-center'>
                  <QrCode className='size-8 mx-auto text-emerald-400 mb-1' />
                  <p className='text-[10px] text-emerald-600 font-medium'>QR: {t.code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue Section (THE KEY FEATURE) ─────────────────────────────────
function RevenueSection() {
  const [period, setPeriod] = React.useState<'day' | 'month' | 'year'>('month');
  const [dateOffset, setDateOffset] = React.useState(0);
  const [sortBy, setSortBy] = React.useState<'revenue' | 'orders' | 'date'>('revenue');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const targetDate = new Date();
  if (period === 'day') targetDate.setDate(targetDate.getDate() + dateOffset);
  else if (period === 'month') targetDate.setMonth(targetDate.getMonth() + dateOffset);
  else targetDate.setFullYear(targetDate.getFullYear() + dateOffset);

  const revenueUrl = `/api/revenue?period=${period}&date=${targetDate.toISOString()}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
  const { data: rev, loading } = useFetch<RevenueDetail>(revenueUrl);

  const barConfig: ChartConfig = { revenue: { label: 'Revenue', color: '#10b981' }, orders: { label: 'Orders', color: '#f59e0b' } };

  const prevPeriod = () => { if (period === 'day') setDateOffset(d => d - 1); else if (period === 'month') setDateOffset(d => d - 1); else setDateOffset(d => d - 1); };
  const nextPeriod = () => { if (dateOffset < 0) setDateOffset(d => d + 1); };
  const periodLabel = rev?.period || '';

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Period selector + navigation */}
      <Card>
        <CardContent className='p-3 sm:p-4'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
            <div className='flex items-center gap-2'>
              <Button variant='outline' size='icon' className='size-8' onClick={prevPeriod}><ChevronRight className='size-4 rotate-180' /></Button>
              <Button variant='outline' size='icon' className='size-8' onClick={nextPeriod} disabled={dateOffset >= 0}><ChevronRight className='size-4' /></Button>
            </div>
            <div className='flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                {(['day', 'month', 'year'] as const).map(p => (
                  <Button key={p} variant={period === p ? 'default' : 'outline'} size='sm' className={cn('h-8 text-xs capitalize', period === p && 'bg-emerald-600 hover:bg-emerald-700')} onClick={() => { setPeriod(p); setDateOffset(0); }}>
                    <Calendar className='size-3.5 mr-1' />{p}
                  </Button>
                ))}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>{periodLabel}</p>
            </div>
            <div className='flex items-center gap-2'>
              <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
                <SelectTrigger className='h-8 w-[120px] text-xs'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='revenue'>Sort: Revenue</SelectItem>
                  <SelectItem value='orders'>Sort: Orders</SelectItem>
                  <SelectItem value='date'>Sort: Date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant='outline' size='icon' className='size-8' onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'desc' ? <ArrowDown className='size-3.5' /> : <ArrowUp className='size-3.5' />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      {rev && <div className='grid grid-cols-3 gap-3'>
        <StatCard icon={DollarSign} label='Revenue' value={formatCurrency(rev.totalRevenue)} sub='total sales' accent='emerald' />
        <StatCard icon={ShoppingBag} label='Orders' value={String(rev.totalOrders)} sub='completed' accent='amber' />
        <StatCard icon={TrendingUp} label='Avg Value' value={formatCurrency(rev.avgOrderValue)} sub='per order' accent='sky' />
      </div>}

      {loading && !rev && <div className='space-y-4'>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-64 w-full rounded-2xl' />)}</div>}

      {rev && <>
        {/* Daily breakdown chart + table */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <button className='flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-left transition-colors hover:from-emerald-100 hover:to-teal-100 ring-1 ring-emerald-200'>
              <div className='flex items-center gap-3'>
                <span className='flex size-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-emerald-200'>📅</span>
                <div><p className='font-bold text-sm sm:text-base'>Daily Breakdown</p><p className='text-xs text-muted-foreground'>{rev.dailyBreakdown.length} days with sales</p></div>
              </div>
              <ChevronDown className='size-5 text-emerald-600' data-state='open' />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='mt-3 space-y-4'>
              <Card className='hidden sm:block'>
                <CardHeader className='pb-2'><CardTitle className='text-sm'>Daily Revenue Trend</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={barConfig} className='h-[220px] w-full'>
                    <BarChart data={rev.dailyBreakdown} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                      <XAxis dataKey='date' tickLine={false} axisLine={false} fontSize={10} stroke='#94a3b8' />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} stroke='#94a3b8' width={50} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey='revenue' fill='#10b981' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardContent className='p-0'>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-xs sm:text-sm'>
                      <thead><tr className='border-b bg-muted/50'>
                        <th className='text-left p-3 font-semibold'>Date</th>
                        <th className='text-right p-3 font-semibold'>Revenue</th>
                        <th className='text-right p-3 font-semibold hidden sm:table-cell'>Orders</th>
                        <th className='text-right p-3 font-semibold hidden md:table-cell'>Avg Value</th>
                      </tr></thead>
                      <tbody>
                        {rev.dailyBreakdown.map((d, i) => (
                          <tr key={i} className='border-b last:border-0 hover:bg-muted/30 transition-colors'>
                            <td className='p-3 font-medium'>{d.date}</td>
                            <td className='p-3 text-right font-mono font-semibold text-emerald-700 tabular-nums'>{formatCurrency(d.revenue)}</td>
                            <td className='p-3 text-right font-mono tabular-nums hidden sm:table-cell'>{d.orders}</td>
                            <td className='p-3 text-right font-mono tabular-nums hidden md:table-cell'>{formatCurrency(d.avgOrderValue)}</td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Category-wise breakdown */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <button className='flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left transition-colors hover:from-amber-100 hover:to-orange-100 ring-1 ring-amber-200'>
              <div className='flex items-center gap-3'>
                <span className='flex size-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-amber-200'>📂</span>
                <div><p className='font-bold text-sm sm:text-base'>Category-Wise Revenue</p><p className='text-xs text-muted-foreground'>{rev.categoryBreakdown.length} categories</p></div>
              </div>
              <ChevronDown className='size-5 text-amber-600' data-state='open' />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {rev.categoryBreakdown.map((c, i) => (
                <Card key={i} className='overflow-hidden hover:shadow-md transition-shadow'>
                  <div className='flex items-center gap-3 p-4'>
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl text-lg' style={{ background: `${CAT_COLORS[i % CAT_COLORS.length]}20`, color: CAT_COLORS[i % CAT_COLORS.length] }}>
                      {c.categoryEmoji || '📂'}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='font-semibold text-sm truncate'>{c.categoryName}</p>
                      <p className='text-xs text-muted-foreground'>{c.productCount} products · {c.orders} orders</p>
                    </div>
                    <div className='text-right shrink-0'>
                      <p className='font-mono text-sm font-bold text-emerald-700 tabular-nums'>{formatCurrency(c.revenue)}</p>
                    </div>
                  </div>
                  <div className='px-4 pb-3'>
                    <div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
                      <div className='h-full rounded-full transition-all' style={{ width: `${rev.categoryBreakdown.length > 0 ? (c.revenue / Math.max(...rev.categoryBreakdown.map(x => x.revenue))) * 100 : 0}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    </div>
                  </div>
                </Card>))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Product-wise breakdown */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className='flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 p-4 text-left transition-colors hover:from-violet-100 hover:to-purple-100 ring-1 ring-violet-200'>
              <div className='flex items-center gap-3'>
                <span className='flex size-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-violet-200'>🍽️</span>
                <div><p className='font-bold text-sm sm:text-base'>Product-Wise Revenue</p><p className='text-xs text-muted-foreground'>{rev.productBreakdown.length} products</p></div>
              </div>
              <ChevronDown className='size-5 text-violet-600' />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='mt-3'>
              <Card>
                <CardContent className='p-0'>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-xs sm:text-sm'>
                      <thead><tr className='border-b bg-muted/50'>
                        <th className='text-left p-3 font-semibold'>#</th>
                        <th className='text-left p-3 font-semibold'>Product</th>
                        <th className='text-left p-3 font-semibold hidden sm:table-cell'>Category</th>
                        <th className='text-right p-3 font-semibold'>Qty</th>
                        <th className='text-right p-3 font-semibold'>Revenue</th>
                      </tr></thead>
                      <tbody>
                        {rev.productBreakdown.map((p, i) => (
                          <tr key={i} className='border-b last:border-0 hover:bg-muted/30 transition-colors'>
                            <td className='p-3'><span className={cn('flex size-6 items-center justify-center rounded-full text-[10px] font-bold', i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground')}>{i + 1}</span></td>
                            <td className='p-3'><span className='flex items-center gap-2'><span>{p.productEmoji}</span><span className='font-medium'>{p.productName}</span></span></td>
                            <td className='p-3 text-muted-foreground hidden sm:table-cell'>{p.categoryName}</td>
                            <td className='p-3 text-right font-mono tabular-nums'>{p.quantity}</td>
                            <td className='p-3 text-right font-mono font-semibold text-emerald-700 tabular-nums'>{formatCurrency(p.revenue)}</td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
type AnalyticsResponse = Analytics & { tableCount: number; productCount: number; lowStock: any[]; avgPrepTime: number };

function handleLogout() {
  signOut({ redirect: false }).then(() => { window.location.href = '/'; });
}

// ─── Login Screen ─────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError('Invalid email or password');
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4'>
      <Card className='w-full max-w-sm shadow-xl border-0'>
        <CardHeader className='text-center pb-2'>
          <div className='mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-3xl shadow-lg mb-3'>🍽️</div>
          <CardTitle className='text-xl font-bold'>QuickOrder</CardTitle>
          <CardDescription>Sign in to your restaurant dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Email</label>
              <Input type='email' placeholder='admin@quickorder.in' value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Password</label>
              <Input type='password' placeholder='••••••••' value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className='text-sm text-red-600 text-center'>{error}</p>}
            <Button type='submit' className='w-full bg-emerald-600 hover:bg-emerald-700' disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const [section, setSection] = React.useState<Section>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const { data: business } = useFetch<Business>('/api/business');
  const { data: orders } = useFetch<Order[]>('/api/orders?limit=200', { interval: 15000 });
  const { data: analytics } = useFetch<AnalyticsResponse>('/api/analytics', { interval: 30000 });
  const { data: categories } = useFetch<Category[]>('/api/categories');
  const { data: tables } = useFetch<TableType[]>('/api/tables');

  const activeOrders = (orders || []).filter(o => ['received', 'accepted', 'preparing', 'ready'].includes(o.status)).length;

  return (
    <div className='min-h-screen flex flex-col bg-muted/30'>
      {/* Header - responsive */}
      <header className='sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur'>
        {/* Mobile menu toggle */}
        <button className='lg:hidden flex size-9 items-center justify-center rounded-xl hover:bg-muted' onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label='Toggle menu'>
          <MenuIcon className='size-5' />
        </button>
        {business ? (
          <div className='flex items-center gap-3 min-w-0 flex-1'>
            <div className='flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-lg sm:text-xl shadow-sm'>{business.logoEmoji}</div>
            <div className='min-w-0'>
              <p className='truncate text-sm sm:text-base font-bold'>{business.name}</p>
              <p className='hidden sm:block text-xs text-muted-foreground'>{business.tagline}</p>
            </div>
          </div>
        ) : <Skeleton className='size-9 rounded-xl' />}
        <div className='flex items-center gap-2'>
          {activeOrders > 0 && <Badge className='bg-emerald-100 text-emerald-700 tabular-nums hidden sm:flex'>{activeOrders} active</Badge>}
          <Button variant='ghost' size='sm' className='h-8 gap-1.5 text-muted-foreground hover:text-red-600' onClick={handleLogout}>
            <LogOut className='size-4' /><span className='hidden sm:inline text-xs'>Logout</span>
          </Button>
        </div>
      </header>

      <div className='flex flex-1'>
        {/* Sidebar - desktop only */}
        <aside className='hidden lg:flex w-56 flex-col border-r bg-background/50 p-3 gap-1'>
          <p className='px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Dashboard</p>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button key={item.key} onClick={() => setSection(item.key)}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                <Icon className='size-4' />{item.label}
                {item.key === 'orders' && activeOrders > 0 && <span className='ml-auto flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white'>{activeOrders}</span>}
              </button>);
          })}
          <div className='mt-auto pt-4'>
            <Separator className='mb-2' />
            <button onClick={handleLogout}
              className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600'>
              <LogOut className='size-4' />Logout
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileMenuOpen && <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-40 bg-black/40 lg:hidden' onClick={() => setMobileMenuOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className='fixed inset-y-0 left-0 z-50 w-[280px] bg-background shadow-xl lg:hidden'>
              <div className='flex items-center justify-between p-4 border-b'>
                <div className='flex items-center gap-2'><span className='text-xl'>{business?.logoEmoji || '🍽️'}</span><span className='font-bold'>{business?.name || 'QuickOrder'}</span></div>
                <button onClick={() => setMobileMenuOpen(false)} className='size-8 flex items-center justify-center rounded-lg hover:bg-muted'><X className='size-4' /></button>
              </div>
              <nav className='p-3 space-y-1'>
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon; const active = section === item.key;
                  return (
                    <button key={item.key} onClick={() => { setSection(item.key); setMobileMenuOpen(false); }}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                        active ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted')}>
                      <Icon className='size-5' />{item.label}
                      {item.key === 'orders' && activeOrders > 0 && <span className='ml-auto flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white'>{activeOrders}</span>}
                    </button>);
                })}
                <Separator className='my-2' />
                <button onClick={handleLogout}
                  className='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50'>
                  <LogOut className='size-5' />Logout
                </button>
              </nav>
            </motion.div>
          </>}
        </AnimatePresence>

        {/* Main content */}
        <main className='flex-1 min-w-0'>
          <div className='mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6'>
            {/* Mobile tab bar */}
            <div className='lg:hidden mb-4 overflow-x-auto -mx-3 px-3'>
              <div className='flex gap-1 min-w-max'>
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon; const active = section === item.key;
                  return (
                    <button key={item.key} onClick={() => setSection(item.key)}
                      className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                        active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted')}>
                      <Icon className='size-3.5' />{item.label}
                      {item.key === 'orders' && activeOrders > 0 && <span className='flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white'>{activeOrders}</span>}
                    </button>);
                })}
              </div>
            </div>

            {/* Section content */}
            <AnimatePresence mode='wait'>
              <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {section === 'overview' && <OverviewSection business={business} analytics={analytics} />}
                {section === 'orders' && <OrdersSection orders={orders || []} />}
                {section === 'menu' && <MenuSection categories={categories} />}
                {section === 'qr' && <QrSection tables={tables} />}
                {section === 'revenue' && <RevenueSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className='border-t bg-background/95 px-4 py-2 text-[11px] text-muted-foreground'>
        <div className='mx-auto max-w-6xl flex items-center justify-between gap-2'>
          <span className='flex items-center gap-1.5'><UtensilsCrossed className='size-3.5' />QuickOrder · Owner Dashboard</span>
          <span className='flex items-center gap-1.5'><ShoppingBag className='size-3.5' /><span className='tabular-nums'>{orders?.length || 0}</span> orders</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Main Page (auth gate) ────────────────────────────────────────
export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') return (
    <div className='min-h-screen flex items-center justify-center bg-muted/30'>
      <div className='text-center space-y-3'>
        <div className='mx-auto size-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600' />
        <p className='text-sm text-muted-foreground'>Loading...</p>
      </div>
    </div>
  );

  if (!session) return <LoginScreen />;

  return <Dashboard />;
}
