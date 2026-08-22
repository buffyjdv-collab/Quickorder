import type { Order, OrderItem, AuditEntry, Product, Business } from "./types";
import { parseJSON } from "./format";

export function serializeOrder(order: any): Order {
  return {
    ...order,
    items: (order.items || []).map(serializeOrderItem),
    auditTrail: parseJSON<AuditEntry[]>(order.auditTrail, []),
  };
}

function serializeOrderItem(item: any): OrderItem {
  return {
    ...item,
    variants: parseJSON(item.variants, []),
    addOns: parseJSON(item.addOns, []),
  };
}

export function serializeProduct(p: any): Product {
  return {
    ...p,
    variants: parseJSON(p.variants, []),
    addOns: parseJSON(p.addOns, []),
    tags: parseJSON(p.tags, []),
  };
}

export function serializeBusiness(b: any): Business {
  return b as Business;
}