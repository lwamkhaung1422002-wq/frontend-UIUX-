import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import { getAuthUser, requireAuth } from "../middleware/auth.middleware.js";

export const workspaceAlertsRouter = Router();
const shopParams = z.object({ shopId: z.string().min(1) });
const notificationParams = shopParams.extend({ notificationId: z.string().min(1) });
const dateKey = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const addDays = (key: string, days: number) => { const value = new Date(`${key}T00:00:00+06:30`); value.setUTCDate(value.getUTCDate() + days); return dateKey(value); };

async function syncAlerts(shopId: string) {
  const today = dateKey(); const tomorrow = addDays(today, 1);
  const [purchases, deliveries, products] = await Promise.all([
    prisma.purchase.findMany({ where: { shopId, status: { not: "cancelled" }, paymentStatus: { not: "paid" }, expectedAt: { not: null } }, include: { supplier: true } }),
    prisma.supplierDeliveryRecord.findMany({ where: { shopId }, include: { supplier: true, payments: { where: { reversedAt: null } } } }),
    prisma.product.findMany({ where: { shopId, isActive: true }, include: { balances: true } }),
  ]);
  const candidates: Array<{ type: string; entityId: string; title: string; message: string }> = [];
  for (const purchase of purchases) {
    const due = purchase.expectedAt ? dateKey(purchase.expectedAt) : ""; if (![today, tomorrow].includes(due)) continue;
    candidates.push({ type: due === today ? "SUPPLIER_DUE" : "SUPPLIER_DUE_TOMORROW", entityId: purchase.id, title: due === today ? "Supplier payment due today" : "Supplier payment due tomorrow", message: `${purchase.supplier.name} · ${purchase.purchaseNumber}` });
  }
  for (const record of deliveries) {
    const paid = record.payments.reduce((sum, payment) => sum + payment.amount, 0); const due = record.dueAt ? dateKey(record.dueAt) : ""; if (paid >= record.amount || ![today, tomorrow].includes(due)) continue;
    candidates.push({ type: due === today ? "SUPPLIER_DUE" : "SUPPLIER_DUE_TOMORROW", entityId: record.id, title: due === today ? "Supplier payment due today" : "Supplier payment due tomorrow", message: `${record.supplierName} · ${record.invoiceNumber}` });
  }
  for (const product of products) {
    const stock = product.balances.reduce((sum, balance) => sum + Number(balance.onHand) - Number(balance.reserved), 0);
    if (stock <= product.minimumStock) candidates.push({ type: "LOW_STOCK", entityId: product.id, title: "Low stock alert", message: `${product.name}: ${stock} pcs remaining` });
  }
  await Promise.all(candidates.map((entry) => prisma.notification.upsert({ where: { shopId_type_entityId_dateKey: { shopId, type: entry.type, entityId: entry.entityId, dateKey: today } }, update: { title: entry.title, message: entry.message, resolvedAt: null }, create: { shopId, ...entry, dateKey: today } })));
}

workspaceAlertsRouter.use(requireAuth);
workspaceAlertsRouter.get("/:shopId/notifications", async (request, response, next) => { try { const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); await assertUserOwnsShop(auth.id, shopId); await syncAlerts(shopId); const notifications = await prisma.notification.findMany({ where: { shopId, resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 50 }); response.json({ notifications }); } catch (error) { next(error); } });
workspaceAlertsRouter.patch("/:shopId/notifications/:notificationId/read", async (request, response, next) => { try { const auth = getAuthUser(request); const { shopId, notificationId } = notificationParams.parse(request.params); await assertUserOwnsShop(auth.id, shopId); const notification = await prisma.notification.updateMany({ where: { id: notificationId, shopId }, data: { readAt: new Date() } }); if (!notification.count) throw Object.assign(new Error("Notification not found."), { name: "NotFoundError" }); response.json({ read: true }); } catch (error) { next(error); } });

workspaceAlertsRouter.get("/:shopId/payment-history", async (request, response, next) => { try {
  const auth = getAuthUser(request); const { shopId } = shopParams.parse(request.params); await assertUserOwnsShop(auth.id, shopId);
  const [orders, purchases, deliveries, expenses] = await Promise.all([
    prisma.order.findMany({ where: { shopId, paymentTracking: true }, include: { payments: true, customer: true, items: true } }),
    prisma.purchase.findMany({ where: { shopId }, include: { supplier: true, payments: true } }),
    prisma.supplierDeliveryRecord.findMany({ where: { shopId, status: { not: "cancelled" } }, include: { supplier: true, payments: true } }),
    prisma.expense.findMany({ where: { shopId } }),
  ]);
  const latest = <T extends { paidAt?: Date; createdAt?: Date }>(items: T[]) => [...items].sort((a, b) => Number(new Date(b.paidAt ?? b.createdAt ?? 0)) - Number(new Date(a.paidAt ?? a.createdAt ?? 0)))[0];
  const activeOrderPayments = (order: typeof orders[number]) => order.payments.filter((payment) => payment.amount > 0 && !order.payments.some((reversal) => reversal.amount < 0 && reversal.originalPaymentId === payment.id));
  const sales = orders.map((order) => { const payments = activeOrderPayments(order); const paid = payments.reduce((sum, payment) => sum + payment.amount, 0); const remainingAmount = Math.max(0, order.total - paid); const last = latest(payments); const status = order.fulfillmentStatus === "cancelled" ? "Cancel" : paid >= order.total ? "Paid" : paid > 0 ? "Partial" : "Unpaid"; return { id: order.orderNumber || order.id, apiId: order.id, kind: "sale", name: "Sale", status, amount: order.total, remainingAmount, method: last?.method || "", occurredAt: last?.paidAt || order.createdAt, buyer: order.customer?.name || "Sale", qty: order.items.reduce((sum, item) => sum + item.quantity, 0), hasPaymentRecord: payments.length > 0, activePaymentRecordCount: payments.length, paymentOptions: payments.slice(1).map((payment) => ({ id: payment.id, amount: payment.amount, method: payment.method || "Cash", paidAt: payment.paidAt || payment.createdAt })) }; });
  const purchaseEntries = purchases.map((purchase) => { const payments = purchase.payments.filter((payment) => !payment.reversedAt); const paid = payments.reduce((sum, payment) => sum + payment.amount, 0); const last = latest(payments); return { id: purchase.purchaseNumber, apiId: purchase.id, supplierId: purchase.supplierId, kind: "supplier", name: purchase.supplier.name, status: paid >= purchase.total ? "Paid" : paid > 0 ? "Partial" : "Unpaid", amount: purchase.total, remainingAmount: Math.max(0, purchase.total - paid), method: last?.method || "", occurredAt: last?.paidAt || purchase.expectedAt || purchase.createdAt }; });
  const deliveryEntries = deliveries.map((record) => { const payments = record.payments.filter((payment) => !payment.reversedAt); const paid = payments.reduce((sum, payment) => sum + payment.amount, 0); const last = latest(payments); return { id: record.invoiceNumber, apiId: record.id, supplierId: record.supplierId, kind: "supplier-delivery", name: record.supplierName, status: paid >= record.amount ? "Paid" : paid > 0 ? "Partial" : "Unpaid", amount: record.amount, remainingAmount: Math.max(0, record.amount - paid), method: last?.method || "", occurredAt: last?.paidAt || record.dueAt || record.receivedAt, deliveryOnly: true }; });
  const expenseEntries = expenses.map((expense) => ({ id: expense.id, apiId: expense.id, kind: "expense", name: expense.title, status: "Paid", amount: expense.amount, remainingAmount: 0, method: expense.method, occurredAt: expense.spentAt || expense.createdAt }));
  const supplierPaymentCancellations = deliveries.flatMap((record) => record.payments.filter((payment) => payment.reversedAt).map((payment) => ({ id: `cancel-${payment.id}`, apiId: record.id, paymentId: payment.id, kind: "supplier-payment-cancelled", name: record.supplierName, status: "Cancelled", amount: payment.amount, remainingAmount: 0, method: payment.method, occurredAt: payment.reversedAt!, reason: payment.reversalReason || "Supplier payment cancelled", deliveryOnly: true })));
  response.json({ records: [...sales, ...purchaseEntries, ...deliveryEntries, ...supplierPaymentCancellations, ...expenseEntries].sort((a, b) => Number(new Date(b.occurredAt)) - Number(new Date(a.occurredAt))) });
} catch (error) { next(error); } });
