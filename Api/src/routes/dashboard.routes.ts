import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { assertUserOwnsShop } from "../lib/shop-access.js";
import { getAuthUser, requireAuth } from "../middleware/auth.middleware.js";

export const dashboardRouter = Router();

const paramsSchema = z.object({
  shopId: z.string().min(1),
});

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

dashboardRouter.use(requireAuth);

function dateRange(input: z.infer<typeof querySchema>) {
  if (!input.from && !input.to) return undefined;

  const endOfDay = input.to ? new Date(input.to) : undefined;
  endOfDay?.setHours(23, 59, 59, 999);

  return {
    ...(input.from ? { gte: input.from } : {}),
    ...(endOfDay ? { lte: endOfDay } : {}),
  };
}

function isRecognizedSale(order: {
  fulfillmentStatus: string;
}): boolean {
  return order.fulfillmentStatus === "completed";
}

function recognizedAt(order: {
  completedAt: Date | null;
  items: Array<{ recognizedAt: Date | null }>;
}): Date | null {
  return order.completedAt
    ?? order.items.map((item) => item.recognizedAt).find((value): value is Date => Boolean(value))
    ?? null;
}

function isInRange(value: Date | null, range: ReturnType<typeof dateRange>): boolean {
  if (!value) return false;
  return (!range?.gte || value >= range.gte) && (!range?.lte || value <= range.lte);
}

function parseJsonArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function paidAmountForOrder(orderId: string, payments: Array<{
  orderId: string | null;
  orderIds: string | null;
  allocations: string | null;
  amount: number;
  type: string;
  scope: string | null;
}>): number {
  return payments.reduce((sum, payment) => {
    if (payment.type === "refund" || payment.scope === "cod-settlement-void") {
      return sum;
    }

    if (payment.orderId === orderId) {
      return sum + payment.amount;
    }

    const orderIds = parseJsonArray(payment.orderIds).filter((entry): entry is string => typeof entry === "string");
    if (!orderIds.includes(orderId)) return sum;

    const allocations = parseJsonArray(payment.allocations);
    const allocation = allocations.find((entry) => {
      return typeof entry === "object" && entry !== null && "orderId" in entry && entry.orderId === orderId;
    });

    if (
      typeof allocation === "object" &&
      allocation !== null &&
      "amount" in allocation &&
      typeof allocation.amount === "number"
    ) {
      return sum + allocation.amount;
    }

    return sum;
  }, 0);
}

dashboardRouter.get("/:shopId/dashboard", async (request, response, next) => {
  try {
    const authUser = getAuthUser(request);
    const { shopId } = paramsSchema.parse(request.params);
    const query = querySchema.parse(request.query);

    await assertUserOwnsShop(authUser.id, shopId);

    const recognitionRange = dateRange(query);
    const expenseSpentAt = dateRange(query);

    const [orders, payments, expenses, customersCount, productsCount, categoriesCount, lowStockBatches, purchases, balances] = await Promise.all([
      prisma.order.findMany({
        where: { shopId },
        include: {
          items: true,
          customer: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({ where: { shopId } }),
      prisma.expense.findMany({
        where: {
          shopId,
          ...(expenseSpentAt ? { spentAt: expenseSpentAt } : {}),
        },
      }),
      prisma.customer.count({ where: { shopId } }),
      prisma.product.count({ where: { shopId, isActive: true } }),
      prisma.category.count({ where: { shopId } }),
      prisma.inventoryBatch.findMany({
        where: { shopId },
        include: {
          product: true,
          variant: true,
        },
      }),
      prisma.purchase.findMany({
        where: { shopId },
        include: { payments: true, supplier: true },
        orderBy: { expectedAt: "asc" },
      }),
      prisma.inventoryBalance.findMany({ where: { shopId }, include: { product: true } }),
    ]);

    const recognizedOrders = orders.filter((order) =>
      isRecognizedSale(order) && (!recognitionRange || isInRange(recognizedAt(order), recognitionRange)),
    );
    const periodPayments = payments.filter((payment) => !recognitionRange || isInRange(payment.paidAt, recognitionRange));
    const refunds = periodPayments.filter((payment) => payment.type === "refund").reduce((sum, payment) => sum + payment.amount, 0);
    const revenue = recognizedOrders.reduce((sum, order) => sum + order.total, 0) - refunds;
    const costOfGoods = recognizedOrders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + item.unitCost * item.quantity,
          0,
        ),
      0,
    );
    const grossProfit = revenue - costOfGoods;
    const operatingExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = grossProfit - operatingExpenses;
    const unpaidTotal = orders
      .filter((order) => isRecognizedSale(order))
      .reduce((sum, order) => sum + Math.max(0, order.total - paidAmountForOrder(order.id, payments)), 0);
    const cashReceived = periodPayments
      .filter((payment) => payment.type === "payment" && payment.scope !== "cod-settlement-void")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const purchasePayments = purchases.flatMap((purchase) => purchase.payments)
      .filter((payment) => !payment.reversedAt && (!recognitionRange || isInRange(payment.paidAt, recognitionRange)))
      .reduce((sum, payment) => sum + payment.amount, 0);
    const supplierPayable = purchases.reduce((sum, purchase) => sum + Math.max(0, purchase.total - purchase.paidAmount), 0);
    const inventoryValuation = balances.reduce((sum, balance) =>
      sum + Number(balance.onHand) * Number(balance.product.cost ?? 0), 0);
    const cashBalance = cashReceived - refunds - purchasePayments - operatingExpenses;
    const cashOut = purchasePayments + operatingExpenses + refunds;
    const stockUnits = balances.reduce((sum, balance) => sum + Math.max(0, Number(balance.onHand)), 0);

    const lowStock = lowStockBatches
      .map((batch) => ({
        inventoryBatchId: batch.id,
        productId: batch.productId,
        productCode: batch.product.sku,
        productName: batch.product.name,
        variantId: batch.variantId,
        variantName: batch.variant?.name ?? null,
        availableQuantity: batch.quantity - batch.reservedQuantity,
      }))
      .filter((batch) => batch.availableQuantity <= 5)
      .sort((a, b) => a.availableQuantity - b.availableQuantity);

    const paymentMethodForOrder = (orderId: string) => payments
      .filter((payment) => {
        if (payment.type !== "payment" || payment.scope === "cod-settlement-void") return false;
        if (payment.orderId === orderId) return true;
        return parseJsonArray(payment.orderIds).some((entry) => entry === orderId);
      })
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())[0]?.method ?? "ငွေသား";

    const recentSales = recognizedOrders
      .sort((a, b) => (recognizedAt(b)?.getTime() ?? 0) - (recognizedAt(a)?.getTime() ?? 0))
      .slice(0, 10)
      .map((order) => ({
        id: order.id,
        invoiceNumber: order.orderNumber ?? order.id.slice(-6).toUpperCase(),
        customerName: order.customer?.name ?? "လမ်းလျှောက်ဝယ်သူ",
        amount: order.total,
        paymentStatus: order.paymentStatus,
        paymentMethod: paymentMethodForOrder(order.id),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        completedAt: recognizedAt(order),
      }));

    const upcomingPayables = purchases
      .filter((purchase) => purchase.status !== "cancelled" && purchase.total > purchase.paidAmount)
      .slice(0, 6)
      .map((purchase) => ({
        id: purchase.id,
        supplierName: purchase.supplier.name,
        amount: Math.max(0, purchase.total - purchase.paidAmount),
        dueDate: purchase.expectedAt,
        purchaseNumber: purchase.purchaseNumber,
      }));

    response.status(200).json({
      summary: {
        revenue,
        costOfGoods,
        grossProfit,
        operatingExpenses,
        netProfit,
        unpaidTotal,
        customerReceivables: unpaidTotal,
        supplierPayables: supplierPayable,
        cashReceived,
        purchasePayments,
        refunds,
        cashOut,
        cashBalance,
        inventoryValuation,
        salesCount: recognizedOrders.length,
        ordersCount: orders.length,
        customersCount,
        activeProductsCount: productsCount,
        categoriesCount,
        stockUnits,
      },
      lowStock,
      recentSales,
      upcomingPayables,
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/:shopId/reports/sales", async (request, response, next) => {
  try {
    const authUser = getAuthUser(request);
    const { shopId } = paramsSchema.parse(request.params);
    const query = querySchema.parse(request.query);

    await assertUserOwnsShop(authUser.id, shopId);

    const recognitionRange = dateRange(query);

    const orders = await prisma.order.findMany({
      where: { shopId },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = orders
      .filter((order) => !recognitionRange || isInRange(recognizedAt(order), recognitionRange))
      .map((order) => {
      const costOfGoods = order.items.reduce(
        (sum, item) => sum + item.unitCost * item.quantity,
        0,
      );
      const revenue = isRecognizedSale(order) ? order.total : 0;

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name ?? null,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryFee: order.deliveryFee,
        total: order.total,
        revenue,
        costOfGoods,
        grossProfit: revenue - costOfGoods,
        recognizedAt: recognizedAt(order),
        createdAt: order.createdAt,
      };
      });

    response.status(200).json({ rows });
  } catch (error) {
    next(error);
  }
});
