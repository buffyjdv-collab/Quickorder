export type BusinessType = "restaurant" | "cafe" | "grocery" | "salon" | "pharmacy" | "fashion" | "electronics";

export interface Business {
  id: string; name: string; type: BusinessType; tagline: string | null; description: string | null;
  logoEmoji: string; coverColor: string; phone: string | null; address: string | null;
  upiId: string | null; currency: string; taxRate: number; serviceFee: number;
  openHours: string | null; rating: number; enabled: boolean; platformFeeRate: number;
  defaulter: boolean; createdAt: string; updatedAt: string;
}

export interface Category {
  id: string; businessId: string; name: string; emoji: string | null; sortOrder: number;
}

export interface Product {
  id: string; businessId: string; categoryId: string; name: string;
  description: string | null; price: number; emoji: string; image: string | null;
  imageColor: string; available: boolean; trackStock: boolean; stockQty: number;
  variants: { name: string; required: boolean; options: { name: string; price: number }[] }[];
  addOns: { id: string; name: string; price: number }[];
  tags: string[]; prepTime: number; rating: number; popular: boolean; sortOrder: number;
  category?: Category;
}

export interface Table {
  id: string; businessId: string; name: string; code: string; zone: string | null;
  capacity: number; active: boolean; scans: number; createdAt: string;
}

export type OrderStatus = "received" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "upi" | "card" | "wallet";
export type Role = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

export interface AuditEntry {
  action: "created" | "status_change" | "payment_change" | "cancelled";
  fromStatus: string | null; toStatus: string; byUserId: string | null;
  byName: string; byRole: string; at: string;
}

export interface OrderItem {
  id: string; orderId: string; productId: string; productName: string;
  productEmoji: string; quantity: number; unitPrice: number;
  variants: { variantName: string; optionName: string; price: number }[];
  addOns: { name: string; price: number }[]; totalPrice: number;
}

export interface Order {
  id: string; businessId: string; tableId: string | null; tableCode: string | null;
  orderNumber: number; customerName: string | null; customerPhone: string | null;
  status: OrderStatus; paymentMethod: PaymentMethod; paymentStatus: "pending" | "paid";
  subtotal: number; tax: number; serviceFee: number; total: number;
  notes: string | null; itemCount: number; createdAt: string; updatedAt: string;
  items: OrderItem[]; approvedById: string | null; approvedByName: string | null;
  approvedByRole: Role | null; approvedAt: string | null; auditTrail: AuditEntry[];
}

export interface SessionUser {
  id: string; email: string; name: string; role: Role;
  businessId: string | null; businessName: string | null;
}

export interface Analytics {
  totalRevenue: number; totalOrders: number; avgOrderValue: number;
  completedOrders: number; activeOrders: number; cancelledOrders: number;
  topProducts: { name: string; emoji: string; count: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  revenueByDay: { day: string; revenue: number; orders: number }[];
  paymentBreakdown: { method: string; count: number; revenue: number }[];
}

export interface RevenueDetail {
  period: string;
  totalRevenue: number; totalOrders: number; avgOrderValue: number;
  categoryBreakdown: { categoryName: string; categoryEmoji: string | null; revenue: number; orders: number; productCount: number }[];
  productBreakdown: { productName: string; productEmoji: string; categoryName: string; revenue: number; quantity: number }[];
  dailyBreakdown: { date: string; revenue: number; orders: number; avgOrderValue: number }[];
}