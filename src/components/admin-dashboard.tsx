'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import {
  ArrowDown, ArrowUp, BarChart3, Building2, Calendar, Check, ChevronDown, CreditCard,
  DollarSign, Eye, LogOut, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Shield,
  Trash2, TrendingUp, Users, X, AlertTriangle, Ban, CheckCircle2, Clock, UserCog,
} from 'lucide-react';

import { useSession, signOut } from 'next-auth/react';
import { useFetch } from '@/hooks/use-fetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ─── Types ────────────────────────────────────────────────────────────
type AdminSection = 'overview' | 'businesses' | 'users' | 'revenue' | 'billing';

interface AdminBusiness {
  id: string; name: string; type: string; tagline: string | null; logoEmoji: string;
  coverColor: string; phone: string | null; address: string | null; currency: string;
  taxRate: number; serviceFee: number; platformFeeRate: number; enabled: boolean;
  defaulter: boolean; createdAt: string; updatedAt: string;
  _count?: { users: number; tables: number; billingCycles: number };
}

interface AdminUser {
  id: string; email: string; name: string; role: string;
  businessId: string | null; active: boolean; createdAt: string; updatedAt: string;
  business?: { id: string; name: string; logoEmoji: string } | null;
}

interface RevenueBusiness {
  id: string; name: string; logoEmoji: string; type: string; enabled: boolean; defaulter: boolean;
  revenue: number; orders: number; platformFee: number; feeRate: number;
  billingStatus: string; billingPaid: string | null;
  userCount: number; tableCount: number; completedOrders: number; cancelledOrders: number; activeOrders: number;
}

interface AdminRevenue {
  period: string; periodLabel: string;
  businesses: RevenueBusiness[];
  totals: { revenue: number; orders: number; platformFee: number };
  monthlyTrend: { month: string; totalRevenue: number; totalOrders: number; platformFee: number; businessCount: number }[];
}

interface BillingCycle {
  id: string; businessId: string; month: string;
  business: { id: string; name: string; logoEmoji: string; platformFeeRate: number };
  totalRevenue: number; feeRate: number; feeAmount: number; status: string; paidAt: string | null;
}

const ADMIN_NAV: { key: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'businesses', label: 'Businesses', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
  { key: 'billing', label: 'Billing', icon: CreditCard },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700',
  OWNER: 'bg-emerald-100 text-emerald-700',
  MANAGER: 'bg-amber-100 text-amber-700',
  STAFF: 'bg-slate-100 text-slate-700',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', OWNER: 'Owner', MANAGER: 'Manager', STAFF: 'Staff',
};

const BILLING_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  unbilled: 'bg-slate-100 text-slate-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────
function handleLogout() {
  signOut({ redirect: false }).then(() => { window.location.href = '/'; });
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Request failed' })); throw new Error(e.error || `HTTP ${res.status}`); }
  return res.json();
}

function AdminStatCard({ icon: Icon, label, value, sub, accent, trend }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string;
  sub: string; accent: string; trend?: 'up' | 'down' | null;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-600 ring-amber-200',
    violet: 'bg-violet-50 text-violet-600 ring-violet-200',
    rose: 'bg-rose-50 text-rose-600 ring-rose-200',
    sky: 'bg-sky-50 text-sky-600 ring-sky-200',
  };
  return (
    <Card className='overflow-hidden transition-shadow hover:shadow-md'>
      <CardHeader className='flex flex-row items-start justify-between gap-2 pb-2'>
        <div className='space-y-1 min-w-0'>
          <CardDescription className='text-xs uppercase tracking-wide'>{label}</CardDescription>
          <CardTitle className='text-xl font-bold tabular-nums sm:text-2xl truncate'>{value}</CardTitle>
        </div>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 sm:size-10', colors[accent])}>
          <Icon className='size-4 sm:size-5' />
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <p className='flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground'>
          {trend === 'up' && <ArrowUp className='size-3 text-emerald-600' />}
          {trend === 'down' && <ArrowDown className='size-3 text-red-600' />}
          {sub}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Admin Overview Section ───────────────────────────────────────────
function AdminOverview() {
  const { data: revenue, refetch } = useFetch<AdminRevenue>('/api/admin/revenue', { interval: 60000 });
  const { data: businesses } = useFetch<AdminBusiness[]>('/api/admin/businesses');
  const { data: users } = useFetch<AdminUser[]>('/api/admin/users');

  const totalBiz = businesses?.length || 0;
  const activeBiz = businesses?.filter(b => b.enabled).length || 0;
  const defaulters = businesses?.filter(b => b.defaulter).length || 0;
  const totalUsers = users?.length || 0;

  const trendConfig: ChartConfig = {
    revenue: { label: 'Revenue', color: '#10b981' },
    platformFee: { label: 'Platform Fee', color: '#8b5cf6' },
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold'>Platform Overview</h2>
          <p className='text-sm text-muted-foreground'>All stores performance at a glance</p>
        </div>
        <Button variant='outline' size='sm' onClick={() => refetch()}><RefreshCw className='size-3.5 mr-1.5' />Refresh</Button>
      </div>

      {/* Stats grid */}
      <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
        <AdminStatCard icon={DollarSign} label='Total Revenue' value={formatCurrency(revenue?.totals.revenue || 0)} sub={`${revenue?.totals.orders || 0} orders this month`} accent='emerald' trend='up' />
        <AdminStatCard icon={CreditCard} label='Platform Income' value={formatCurrency(revenue?.totals.platformFee || 0)} sub='from fee commissions' accent='violet' trend='up' />
        <AdminStatCard icon={Building2} label='Active Stores' value={`${activeBiz}/${totalBiz}`} sub={defaulters > 0 ? `${defaulters} defaulter(s)` : 'all stores active'} accent='sky' />
        <AdminStatCard icon={Users} label='Total Users' value={String(totalUsers)} sub='across all stores' accent='amber' />
      </div>

      {/* Revenue trend chart */}
      {revenue?.monthlyTrend && (
        <Card>
          <CardHeader className='pb-2 sm:pb-4'>
            <CardTitle className='text-base font-semibold'>Revenue Trend (12 months)</CardTitle>
            <CardDescription>Platform revenue and fee income over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className='h-64 sm:h-72 w-full'>
              <AreaChart data={revenue.monthlyTrend}>
                <defs>
                  <linearGradient id='fillRevenue' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#10b981' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id='fillFee' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#8b5cf6' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#8b5cf6' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' vertical={false} />
                <XAxis dataKey='month' tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type='monotone' dataKey='revenue' stroke='#10b981' fill='url(#fillRevenue)' strokeWidth={2} />
                <Area type='monotone' dataKey='platformFee' stroke='#8b5cf6' fill='url(#fillFee)' strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Top businesses table */}
      {revenue?.businesses && revenue.businesses.length > 0 && (
        <Card>
          <CardHeader className='pb-2 sm:pb-4'>
            <CardTitle className='text-base font-semibold'>Store Performance</CardTitle>
            <CardDescription>Revenue ranking across all stores this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='max-h-80 overflow-y-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-8'>#</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className='text-right hidden sm:table-cell'>Orders</TableHead>
                    <TableHead className='text-right'>Revenue</TableHead>
                    <TableHead className='text-right'>Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.businesses.sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className='font-mono text-xs text-muted-foreground'>{i + 1}</TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <span className='text-base'>{b.logoEmoji}</span>
                          <div className='min-w-0'>
                            <p className='font-medium text-sm truncate'>{b.name}</p>
                            <p className='text-xs text-muted-foreground'>{b.type}</p>
                          </div>
                          {!b.enabled && <Badge variant='outline' className='text-[10px] text-red-500 border-red-200'>Off</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className='text-right font-mono text-sm hidden sm:table-cell'>{b.orders}</TableCell>
                      <TableCell className='text-right font-mono font-semibold text-sm'>{formatCurrency(b.revenue)}</TableCell>
                      <TableCell className='text-right font-mono text-sm text-violet-600'>{formatCurrency(b.platformFee)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Businesses Section ───────────────────────────────────────────────
function BusinessesSection() {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBiz, setEditingBiz] = React.useState<AdminBusiness | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: '', type: 'restaurant', tagline: '', logoEmoji: '🍽\uFE0F', phone: '', address: '', currency: '\u20B9', taxRate: '5', serviceFee: '0', platformFeeRate: '2', openHours: '', upiId: '' });
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const { data: businesses, refetch } = useFetch<AdminBusiness[]>(`/api/admin/businesses?search=${search}&type=${typeFilter}`);

  const openCreate = () => {
    setEditingBiz(null);
    setForm({ name: '', type: 'restaurant', tagline: '', logoEmoji: '🍽\uFE0F', phone: '', address: '', currency: '\u20B9', taxRate: '5', serviceFee: '0', platformFeeRate: '2', openHours: '', upiId: '' });
    setDialogOpen(true);
  };

  const openEdit = (biz: AdminBusiness) => {
    setEditingBiz(biz);
    setForm({
      name: biz.name, type: biz.type, tagline: biz.tagline || '', logoEmoji: biz.logoEmoji,
      phone: biz.phone || '', address: biz.address || '', currency: biz.currency,
      taxRate: String(biz.taxRate), serviceFee: String(biz.serviceFee),
      platformFeeRate: String(biz.platformFeeRate), openHours: biz.openHours || '', upiId: biz.upiId || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setMsg('');
    try {
      if (editingBiz) {
        await apiFetch(`/api/admin/businesses/${editingBiz.id}`, {
          method: 'PATCH', body: JSON.stringify({
            name: form.name, type: form.type, tagline: form.tagline || null,
            logoEmoji: form.logoEmoji, phone: form.phone || null, address: form.address || null,
            currency: form.currency, taxRate: parseFloat(form.taxRate), serviceFee: parseFloat(form.serviceFee),
            platformFeeRate: parseFloat(form.platformFeeRate), openHours: form.openHours || null, upiId: form.upiId || null,
          }),
        });
        setMsg('Business updated');
      } else {
        await apiFetch('/api/admin/businesses', {
          method: 'POST', body: JSON.stringify({
            name: form.name, type: form.type, tagline: form.tagline || null,
            logoEmoji: form.logoEmoji, phone: form.phone || null, address: form.address || null,
            currency: form.currency, taxRate: parseFloat(form.taxRate), serviceFee: parseFloat(form.serviceFee),
            platformFeeRate: parseFloat(form.platformFeeRate), openHours: form.openHours || null, upiId: form.upiId || null,
          }),
        });
        setMsg('Business created');
      }
      setDialogOpen(false); refetch();
    } catch (e: any) { setMsg(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await apiFetch(`/api/admin/businesses/${deleteId}`, { method: 'DELETE' }); refetch(); } catch {}
    setDeleteId(null);
  };

  const toggleEnabled = async (biz: AdminBusiness) => {
    try { await apiFetch(`/api/admin/businesses/${biz.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !biz.enabled }) }); refetch(); } catch {}
  };

  const toggleDefaulter = async (biz: AdminBusiness) => {
    try { await apiFetch(`/api/admin/businesses/${biz.id}`, { method: 'PATCH', body: JSON.stringify({ defaulter: !biz.defaulter }) }); refetch(); } catch {}
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold'>Businesses</h2>
          <p className='text-sm text-muted-foreground'>{businesses?.length || 0} stores registered</p>
        </div>
        <Button onClick={openCreate} className='bg-violet-600 hover:bg-violet-700'><Plus className='size-4 mr-1.5' />Add Store</Button>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='relative flex-1'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' /><Input placeholder='Search stores...' value={search} onChange={e => setSearch(e.target.value)} className='pl-9' /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className='w-full sm:w-40'><SelectValue placeholder='All types' /></SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Types</SelectItem>
            <SelectItem value='restaurant'>Restaurant</SelectItem>
            <SelectItem value='cafe'>Cafe</SelectItem>
            <SelectItem value='grocery'>Grocery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Business grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'>
        {businesses?.map(biz => (
          <Card key={biz.id} className={cn('transition-all hover:shadow-md', !biz.enabled && 'opacity-60')}>
            <CardHeader className='pb-2'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-2.5 min-w-0'>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-xl shadow-sm'>{biz.logoEmoji}</div>
                  <div className='min-w-0'>
                    <CardTitle className='text-sm font-bold truncate'>{biz.name}</CardTitle>
                    <CardDescription className='text-xs'>{biz.type} · {biz.currency}{biz.platformFeeRate}% fee</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant='ghost' size='icon' className='size-8'><MoreHorizontal className='size-4' /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => openEdit(biz)}><Pencil className='size-3.5 mr-2' />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleEnabled(biz)}>{biz.enabled ? <Ban className='size-3.5 mr-2' /> : <CheckCircle2 className='size-3.5 mr-2' />}{biz.enabled ? 'Disable' : 'Enable'}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleDefaulter(biz)}><AlertTriangle className='size-3.5 mr-2' />{biz.defaulter ? 'Remove Defaulter' : 'Mark Defaulter'}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className='text-red-600' onClick={() => setDeleteId(biz.id)}><Trash2 className='size-3.5 mr-2' />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className='pt-0'>
              {biz.tagline && <p className='text-xs text-muted-foreground mb-2 line-clamp-1'>{biz.tagline}</p>}
              <div className='flex flex-wrap gap-1.5'>
                <Badge variant='outline' className='text-[10px]'>{biz._count?.users || 0} users</Badge>
                <Badge variant='outline' className='text-[10px]'>{biz._count?.tables || 0} tables</Badge>
                {biz.defaulter && <Badge className='text-[10px] bg-red-100 text-red-700'>Defaulter</Badge>}
                {!biz.enabled && <Badge className='text-[10px] bg-slate-100 text-slate-600'>Disabled</Badge>}
              </div>
              <p className='text-[10px] text-muted-foreground mt-2'>Created {formatDate(biz.createdAt)}</p>
            </CardContent>
          </Card>
        ))}
        {!businesses?.length && !search && <Card className='sm:col-span-2 lg:col-span-3'><CardContent className='py-12 text-center text-muted-foreground'>No businesses yet. Create your first store!</CardContent></Card>}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{editingBiz ? 'Edit Store' : 'Create New Store'}</DialogTitle>
            <DialogDescription>{editingBiz ? 'Update store details' : 'Add a new business to the platform'}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-3 py-2'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'><Label className='text-xs'>Store Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder='Tea Hub' /></div>
              <div className='space-y-1.5'><Label className='text-xs'>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value='restaurant'>Restaurant</SelectItem><SelectItem value='cafe'>Cafe</SelectItem><SelectItem value='grocery'>Grocery</SelectItem><SelectItem value='salon'>Salon</SelectItem><SelectItem value='pharmacy'>Pharmacy</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-1.5'><Label className='text-xs'>Tagline</Label><Input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder='Best tea in town' /></div>
            <div className='grid grid-cols-3 gap-3'>
              <div className='space-y-1.5'><Label className='text-xs'>Emoji</Label><Input value={form.logoEmoji} onChange={e => setForm(f => ({ ...f, logoEmoji: e.target.value }))} className='text-center text-xl' /></div>
              <div className='space-y-1.5'><Label className='text-xs'>Currency</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
              <div className='space-y-1.5'><Label className='text-xs'>Platform Fee %</Label><Input type='number' step='0.1' value={form.platformFeeRate} onChange={e => setForm(f => ({ ...f, platformFeeRate: e.target.value }))} /></div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'><Label className='text-xs'>Tax Rate %</Label><Input type='number' step='0.1' value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} /></div>
              <div className='space-y-1.5'><Label className='text-xs'>Service Fee %</Label><Input type='number' step='0.1' value={form.serviceFee} onChange={e => setForm(f => ({ ...f, serviceFee: e.target.value }))} /></div>
            </div>
            <div className='space-y-1.5'><Label className='text-xs'>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder='+91 98765 43210' /></div>
            <div className='space-y-1.5'><Label className='text-xs'>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder='123 Main St, City' /></div>
            <div className='space-y-1.5'><Label className='text-xs'>UPI ID</Label><Input value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} placeholder='owner@upi' /></div>
          </div>
          {msg && <p className={cn('text-xs', msg.includes('Error') || msg.includes('exists') ? 'text-red-600' : 'text-emerald-600')}>{msg}</p>}
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className='bg-violet-600 hover:bg-violet-700'>
              {saving ? 'Saving...' : editingBiz ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Store</DialogTitle><DialogDescription>This will permanently delete this store and all its data (users, tables, orders, billing). This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant='destructive' onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Users Section (UBAC) ─────────────────────────────────────────────
function UsersSection() {
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [bizFilter, setBizFilter] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<AdminUser | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: '', email: '', password: '', role: 'STAFF', businessId: '' });
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const { data: businesses } = useFetch<AdminBusiness[]>('/api/admin/businesses');
  const { data: users, refetch } = useFetch<AdminUser[]>(`/api/admin/users?search=${search}&role=${roleFilter}&businessId=${bizFilter}`);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', email: '', password: '', role: 'STAFF', businessId: '' });
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, businessId: u.businessId || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || (!editUser && !form.email.trim())) return;
    setSaving(true); setMsg('');
    try {
      if (editUser) {
        const payload: Record<string, unknown> = { name: form.name, role: form.role, businessId: form.businessId || null };
        if (form.password) payload.password = form.password;
        await apiFetch(`/api/admin/users/${editUser.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setMsg('User updated');
      } else {
        await apiFetch('/api/admin/users', {
          method: 'POST', body: JSON.stringify({ ...form, businessId: form.businessId || null }),
        });
        setMsg('User created');
      }
      setDialogOpen(false); refetch();
    } catch (e: any) { setMsg(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await apiFetch(`/api/admin/users/${deleteId}`, { method: 'DELETE' }); refetch(); } catch {}
    setDeleteId(null);
  };

  const toggleActive = async (u: AdminUser) => {
    try { await apiFetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) }); refetch(); } catch {}
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold'>Users & Access Control</h2>
          <p className='text-sm text-muted-foreground'>{users?.length || 0} users · UBAC role management</p>
        </div>
        <Button onClick={openCreate} className='bg-violet-600 hover:bg-violet-700'><Plus className='size-4 mr-1.5' />Add User</Button>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='relative flex-1'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' /><Input placeholder='Search by name or email...' value={search} onChange={e => setSearch(e.target.value)} className='pl-9' /></div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className='w-full sm:w-40'><SelectValue placeholder='All roles' /></SelectTrigger>
          <SelectContent><SelectItem value='all'>All Roles</SelectItem><SelectItem value='SUPER_ADMIN'>Super Admin</SelectItem><SelectItem value='OWNER'>Owner</SelectItem><SelectItem value='MANAGER'>Manager</SelectItem><SelectItem value='STAFF'>Staff</SelectItem></SelectContent>
        </Select>
        <Select value={bizFilter} onValueChange={setBizFilter}>
          <SelectTrigger className='w-full sm:w-44'><SelectValue placeholder='All stores' /></SelectTrigger>
          <SelectContent><SelectItem value='all'>All Stores</SelectItem><SelectItem value='none'>No Store (Admin)</SelectItem>{businesses?.map(b => <SelectItem key={b.id} value={b.id}>{b.logoEmoji} {b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className='p-0'>
          <div className='max-h-[500px] overflow-y-auto'>
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead>
                <TableHead className='hidden sm:table-cell'>Store</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className='hidden md:table-cell'>Status</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users?.map(u => (
                  <TableRow key={u.id} className={!u.active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className='min-w-0'>
                        <p className='font-medium text-sm truncate'>{u.name}</p>
                        <p className='text-xs text-muted-foreground truncate'>{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      {u.business ? <span className='flex items-center gap-1.5'><span>{u.business.logoEmoji}</span><span className='text-sm'>{u.business.name}</span></span> : <span className='text-xs text-muted-foreground'>—</span>}
                    </TableCell>
                    <TableCell><Badge className={cn('text-[10px]', ROLE_COLORS[u.role])}>{ROLE_LABELS[u.role] || u.role}</Badge></TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <Badge className={cn('text-[10px]', u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(u)}><Pencil className='size-3.5' /></Button>
                        <Button variant='ghost' size='icon' className='size-7' onClick={() => toggleActive(u)}>{u.active ? <Ban className='size-3.5 text-red-500' /> : <Check className='size-3.5 text-emerald-500' />}</Button>
                        <Button variant='ghost' size='icon' className='size-7' onClick={() => setDeleteId(u.id)}><Trash2 className='size-3.5 text-red-500' /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!users?.length && <div className='py-12 text-center text-sm text-muted-foreground'>No users found</div>}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription>{editUser ? 'Update user details and role' : 'Add a new user to the platform'}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-3 py-2'>
            <div className='space-y-1.5'><Label className='text-xs'>Full Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className='space-y-1.5'><Label className='text-xs'>Email {!editUser && '*'}</Label><Input type='email' value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editUser} /></div>
            <div className='space-y-1.5'><Label className='text-xs'>{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</Label><Input type='password' value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editUser ? 'Leave blank' : 'Min 6 chars'} /></div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'><Label className='text-xs'>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value='SUPER_ADMIN'>Super Admin</SelectItem><SelectItem value='OWNER'>Owner</SelectItem><SelectItem value='MANAGER'>Manager</SelectItem><SelectItem value='STAFF'>Staff</SelectItem></SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'><Label className='text-xs'>Assign Store</Label>
                <Select value={form.businessId || 'none'} onValueChange={v => setForm(f => ({ ...f, businessId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder='None' /></SelectTrigger>
                  <SelectContent><SelectItem value='none'>No Store (Admin)</SelectItem>{businesses?.map(b => <SelectItem key={b.id} value={b.id}>{b.logoEmoji} {b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {msg && <p className={cn('text-xs', msg.includes('exists') || msg.includes('Error') ? 'text-red-600' : 'text-emerald-600')}>{msg}</p>}
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className='bg-violet-600 hover:bg-violet-700'>{saving ? 'Saving...' : editUser ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User</DialogTitle><DialogDescription>Permanently delete this user. Their orders and activity will be preserved.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant='outline' onClick={() => setDeleteId(null)}>Cancel</Button><Button variant='destructive' onClick={handleDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Revenue Section ──────────────────────────────────────────────────
function AdminRevenueSection() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const { data: revenue, refetch } = useFetch<AdminRevenue>(`/api/admin/revenue?month=${month}`);

  const feeConfig: ChartConfig = { revenue: { label: 'Revenue', color: '#10b981' }, platformFee: { label: 'Platform Fee', color: '#8b5cf6' } };

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold'>Revenue Report</h2>
          <p className='text-sm text-muted-foreground'>{revenue?.periodLabel || 'Loading...'}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Input type='month' value={month} onChange={e => setMonth(e.target.value)} className='w-44' />
          <Button variant='outline' size='sm' onClick={() => refetch()}><RefreshCw className='size-3.5' /></Button>
        </div>
      </div>

      {revenue && (<>
        {/* Summary cards */}
        <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
          <AdminStatCard icon={DollarSign} label='Gross Revenue' value={formatCurrency(revenue.totals.revenue)} sub={`${revenue.totals.orders} total orders`} accent='emerald' trend='up' />
          <AdminStatCard icon={CreditCard} label='Platform Fee' value={formatCurrency(revenue.totals.platformFee)} sub={`avg ${(revenue.totals.platformFee / (revenue.totals.revenue || 1) * 100).toFixed(1)}% effective rate`} accent='violet' trend='up' />
          <AdminStatCard icon={Building2} label='Stores' value={String(revenue.businesses.length)} sub={`${revenue.businesses.filter(b => b.revenue > 0).length} with revenue`} accent='sky' />
          <AdminStatCard icon={TrendingUp} label='Avg/Store' value={formatCurrency(revenue.totals.revenue / (revenue.businesses.length || 1))} sub='per store this month' accent='amber' />
        </div>

        {/* Monthly trend */}
        {revenue.monthlyTrend && (
          <Card>
            <CardHeader className='pb-2'><CardTitle className='text-base font-semibold'>Monthly Trend</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={feeConfig} className='h-56 sm:h-64 w-full'>
                <BarChart data={revenue.monthlyTrend}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} />
                  <XAxis dataKey='month' tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey='revenue' fill='#10b981' radius={[4, 4, 0, 0]} />
                  <Bar dataKey='platformFee' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Per-business breakdown */}
        <Card>
          <CardHeader className='pb-2'><CardTitle className='text-base font-semibold'>Per-Store Breakdown</CardTitle></CardHeader>
          <CardContent className='p-0'>
            <div className='max-h-96 overflow-y-auto'>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead className='text-right hidden sm:table-cell'>Orders</TableHead>
                  <TableHead className='text-right hidden md:table-cell'>Completed</TableHead>
                  <TableHead className='text-right hidden md:table-cell'>Cancelled</TableHead>
                  <TableHead className='text-right'>Revenue</TableHead>
                  <TableHead className='text-right'>Fee</TableHead>
                  <TableHead className='hidden sm:table-cell'>Billing</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {revenue.businesses.map(b => (
                    <TableRow key={b.id} className={!b.enabled ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className='flex items-center gap-2 min-w-0'>
                          <span>{b.logoEmoji}</span>
                          <div className='min-w-0'><p className='font-medium text-sm truncate'>{b.name}</p><p className='text-[10px] text-muted-foreground'>{b.userCount} users · {b.tableCount} tables</p></div>
                          {b.defaulter && <Badge className='text-[9px] bg-red-100 text-red-700'>Defaulter</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className='text-right font-mono text-sm hidden sm:table-cell'>{b.orders}</TableCell>
                      <TableCell className='text-right font-mono text-sm hidden md:table-cell text-emerald-600'>{b.completedOrders}</TableCell>
                      <TableCell className='text-right font-mono text-sm hidden md:table-cell text-red-500'>{b.cancelledOrders}</TableCell>
                      <TableCell className='text-right font-mono font-semibold text-sm'>{formatCurrency(b.revenue)}</TableCell>
                      <TableCell className='text-right font-mono text-sm text-violet-600'>{formatCurrency(b.platformFee)}</TableCell>
                      <TableCell className='hidden sm:table-cell'><Badge className={cn('text-[10px]', BILLING_COLORS[b.billingStatus] || BILLING_COLORS.unbilled)}>{b.billingStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </>)}
    </div>
  );
}

// ─── Billing Section ──────────────────────────────────────────────────
function BillingSection() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [generating, setGenerating] = React.useState(false);
  const { data, refetch } = useFetch<{ cycles: BillingCycle[]; summary: { totalRevenue: number; totalFees: number; paid: number; pending: number } }>(`/api/admin/billing?month=${month}&status=${statusFilter}`);

  const generateBills = async () => {
    setGenerating(true);
    try { await apiFetch('/api/admin/billing', { method: 'POST', body: JSON.stringify({ month }) }); refetch(); } catch {}
    setGenerating(false);
  };

  const markPaid = async (id: string) => {
    try { await apiFetch('/api/admin/billing', { method: 'PATCH', body: JSON.stringify({ id, status: 'paid' }) }); refetch(); } catch {}
  };

  const markOverdue = async (id: string) => {
    try { await apiFetch('/api/admin/billing', { method: 'PATCH', body: JSON.stringify({ id, status: 'overdue' }) }); refetch(); } catch {}
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold'>Billing & Collections</h2>
          <p className='text-sm text-muted-foreground'>Track platform fees from all stores</p>
        </div>
        <Button onClick={generateBills} disabled={generating} variant='outline' className='border-violet-300 text-violet-700 hover:bg-violet-50'>
          {generating ? 'Generating...' : <><RefreshCw className='size-3.5 mr-1.5' />Generate Bills</>}
        </Button>
      </div>

      {data && (<>
        {/* Summary cards */}
        <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
          <AdminStatCard icon={DollarSign} label='Total Revenue' value={formatCurrency(data.summary.totalRevenue)} sub='gross across all stores' accent='emerald' />
          <AdminStatCard icon={CreditCard} label='Total Fees' value={formatCurrency(data.summary.totalFees)} sub={`${data.summary.totalFees > 0 ? ((data.summary.totalFees / data.summary.totalRevenue) * 100).toFixed(1) : 0}% of revenue`} accent='violet' />
          <AdminStatCard icon={CheckCircle2} label='Collected' value={formatCurrency(data.summary.paid)} sub={`${data.cycles.filter(c => c.status === 'paid').length} paid`} accent='emerald' />
          <AdminStatCard icon={Clock} label='Outstanding' value={formatCurrency(data.summary.pending)} sub={`${data.cycles.filter(c => c.status !== 'paid').length} pending`} accent='rose' />
        </div>

        {/* Filters */}
        <div className='flex gap-2'>
          <Input type='month' value={month} onChange={e => setMonth(e.target.value)} className='w-44' />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-36'><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value='all'>All Status</SelectItem><SelectItem value='paid'>Paid</SelectItem><SelectItem value='pending'>Pending</SelectItem><SelectItem value='overdue'>Overdue</SelectItem></SelectContent>
          </Select>
        </div>

        {/* Billing table */}
        <Card>
          <CardContent className='p-0'>
            <div className='max-h-[400px] overflow-y-auto'>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead className='text-right hidden sm:table-cell'>Revenue</TableHead>
                  <TableHead className='text-right'>Fee Rate</TableHead>
                  <TableHead className='text-right'>Fee Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='hidden md:table-cell'>Paid Date</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.cycles.map(c => (
                    <TableRow key={c.id}>
                      <TableCell><div className='flex items-center gap-2'><span>{c.business.logoEmoji}</span><span className='font-medium text-sm'>{c.business.name}</span></div></TableCell>
                      <TableCell className='text-right font-mono text-sm hidden sm:table-cell'>{formatCurrency(c.totalRevenue)}</TableCell>
                      <TableCell className='text-right font-mono text-sm'>{c.feeRate}%</TableCell>
                      <TableCell className='text-right font-mono font-semibold text-sm'>{formatCurrency(c.feeAmount)}</TableCell>
                      <TableCell><Badge className={cn('text-[10px]', BILLING_COLORS[c.status] || BILLING_COLORS.pending)}>{c.status}</Badge></TableCell>
                      <TableCell className='hidden md:table-cell text-xs text-muted-foreground'>{c.paidAt ? formatDate(c.paidAt) : '—'}</TableCell>
                      <TableCell className='text-right'>
                        {c.status !== 'paid' && (
                          <div className='flex justify-end gap-1'>
                            <Button variant='ghost' size='sm' className='h-7 text-xs text-emerald-600' onClick={() => markPaid(c.id)}><Check className='size-3 mr-1' />Paid</Button>
                            <Button variant='ghost' size='sm' className='h-7 text-xs text-red-600' onClick={() => markOverdue(c.id)}><AlertTriangle className='size-3 mr-1' />Overdue</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data.cycles.length && <TableRow><TableCell colSpan={7} className='py-12 text-center text-sm text-muted-foreground'>No billing cycles for this month. Click &quot;Generate Bills&quot; to create.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </>)}
    </div>
  );
}

// ─── Admin Dashboard Shell ────────────────────────────────────────────
export function AdminDashboard() {
  const { data: session } = useSession();
  const [section, setSection] = React.useState<AdminSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [month] = React.useState(new Date().toISOString().slice(0, 7));
  const { data: revenue } = useFetch<AdminRevenue>(`/api/admin/revenue?month=${month}`, { interval: 60000 });
  const { data: businesses } = useFetch<AdminBusiness[]>('/api/admin/businesses', { interval: 60000 });

  const unpaidFees = revenue?.totals.platformFee || 0;

  return (
    <div className='min-h-screen flex flex-col bg-muted/30'>
      {/* Header */}
      <header className='sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur'>
        <button className='lg:hidden flex size-9 items-center justify-center rounded-xl hover:bg-muted' onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label='Toggle menu'>
          <svg className='size-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 12h16M4 18h16' /></svg>
        </button>
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <div className='flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-lg sm:text-xl shadow-sm'>
            <Shield className='size-4 sm:size-5 text-white' />
          </div>
          <div className='min-w-0'>
            <p className='truncate text-sm sm:text-base font-bold'>QuickOrder Admin</p>
            <p className='hidden sm:block text-xs text-muted-foreground'>{session?.user?.name || 'Super Admin'} · {businesses?.length || 0} stores</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {unpaidFees > 0 && <Badge className='bg-violet-100 text-violet-700 tabular-nums hidden sm:flex'>{formatCurrency(unpaidFees)} pending</Badge>}
          <Button variant='ghost' size='sm' className='h-8 gap-1.5 text-muted-foreground hover:text-red-600' onClick={handleLogout}>
            <LogOut className='size-4' /><span className='hidden sm:inline text-xs'>Logout</span>
          </Button>
        </div>
      </header>

      <div className='flex flex-1'>
        {/* Sidebar - desktop */}
        <aside className='hidden lg:flex w-56 flex-col border-r bg-background/50 p-3 gap-1'>
          <p className='px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Admin Panel</p>
          {ADMIN_NAV.map(item => {
            const Icon = item.icon; const active = section === item.key;
            return (
              <button key={item.key} onClick={() => setSection(item.key)}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-violet-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                <Icon className='size-4' />{item.label}
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
                <div className='flex items-center gap-2'><Shield className='size-5 text-violet-600' /><span className='font-bold'>Admin Panel</span></div>
                <button onClick={() => setMobileMenuOpen(false)} className='size-8 flex items-center justify-center rounded-lg hover:bg-muted'><X className='size-4' /></button>
              </div>
              <nav className='p-3 space-y-1'>
                {ADMIN_NAV.map(item => {
                  const Icon = item.icon; const active = section === item.key;
                  return (
                    <button key={item.key} onClick={() => { setSection(item.key); setMobileMenuOpen(false); }}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                        active ? 'bg-violet-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted')}>
                      <Icon className='size-5' />{item.label}
                    </button>);
                })}
                <Separator className='my-2' />
                <button onClick={handleLogout} className='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50'>
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
                {ADMIN_NAV.map(item => {
                  const Icon = item.icon; const active = section === item.key;
                  return (
                    <button key={item.key} onClick={() => setSection(item.key)}
                      className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                        active ? 'bg-violet-600 text-white shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted')}>
                      <Icon className='size-3.5' />{item.label}
                    </button>);
                })}
              </div>
            </div>

            <AnimatePresence mode='wait'>
              <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {section === 'overview' && <AdminOverview />}
                {section === 'businesses' && <BusinessesSection />}
                {section === 'users' && <UsersSection />}
                {section === 'revenue' && <AdminRevenueSection />}
                {section === 'billing' && <BillingSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className='border-t bg-background/95 px-4 py-2 text-[11px] text-muted-foreground'>
        <div className='mx-auto max-w-6xl flex items-center justify-between gap-2'>
          <span className='flex items-center gap-1.5'><Shield className='size-3.5 text-violet-500' />QuickOrder · Admin Panel</span>
          <span className='flex items-center gap-1.5'><Building2 className='size-3.5' /><span className='tabular-nums'>{businesses?.length || 0}</span> stores</span>
        </div>
      </footer>
    </div>
  );
}
