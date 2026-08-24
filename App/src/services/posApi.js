import { apiRequest } from "../lib/api";

const queryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const shopPath = (shopId, path) => `/shops/${shopId}${path}`;

export function createPosApi({ token, shopId, onUnauthorized, isGuest = false }) {
  const request = async (path, options) => {
    if (isGuest) throw new Error("Create an account to sync business data.");
    try {
      return await apiRequest(path, { token, ...options });
    } catch (error) {
      if (error.status === 401) onUnauthorized?.();
      throw error;
    }
  };
  const shopRequest = (path, options) => request(shopPath(shopId, path), options);

  return {
    dashboard: (query) => shopRequest(`/dashboard${queryString(query)}`),
    reports: {
      sales: (query) => shopRequest(`/reports/sales${queryString(query)}`),
    },
    shop: {
      get: () => shopRequest(""),
      update: (body) => shopRequest("", { method: "PATCH", body }),
      getSettings: () => shopRequest("/settings"),
      updateSettings: (body) => shopRequest("/settings", { method: "PATCH", body }),
    },
    categories: {
      list: () => shopRequest("/categories"),
      create: (body) => shopRequest("/categories", { method: "POST", body }),
      update: (id, body) => shopRequest(`/categories/${id}`, { method: "PATCH", body }),
      remove: (id) => shopRequest(`/categories/${id}`, { method: "DELETE" }),
    },
    products: {
      list: (query) => shopRequest(`/products${queryString(query)}`),
      get: (id) => shopRequest(`/products/${id}`),
      create: (body) => shopRequest("/products", { method: "POST", body }),
      update: (id, body) => shopRequest(`/products/${id}`, { method: "PATCH", body }),
      generateShortCode: (id) => shopRequest(`/products/${id}/short-code/generate`, { method: "POST" }),
      remove: (id) => shopRequest(`/products/${id}`, { method: "DELETE" }),
    },
    units: {
      list: () => shopRequest("/units"),
    },
    inventory: {
      list: (query) => shopRequest(`/inventory${queryString(query)}`),
      create: (body) => shopRequest("/inventory", { method: "POST", body }),
      adjust: (inventoryBatchId, body) => shopRequest(`/inventory/${inventoryBatchId}/adjustments`, { method: "POST", body }),
      adjustments: (query) => shopRequest(`/inventory-adjustments${queryString(query)}`),
      movements: (query) => shopRequest(`/inventory-movements${queryString(query)}`),
    },
    suppliers: {
      list: (query) => shopRequest(`/suppliers${queryString(query)}`),
      create: (body) => shopRequest("/suppliers", { method: "POST", body }),
      update: (id, body) => shopRequest(`/suppliers/${id}`, { method: "PATCH", body }),
      remove: (id) => shopRequest(`/suppliers/${id}`, { method: "DELETE" }),
    },
    purchases: {
      list: (query) => shopRequest(`/purchases${queryString(query)}`),
      create: (body) => shopRequest("/purchases", { method: "POST", body }),
      pay: (id, body) => shopRequest(`/purchases/${id}/payments`, { method: "POST", body }),
    },
    payments: {
      list: (query) => shopRequest(`/payments${queryString(query)}`),
      addToOrder: (orderId, body) => shopRequest(`/orders/${orderId}/payments`, { method: "POST", body }),
      void: (paymentId, body) => shopRequest(`/payments/${paymentId}/void`, { method: "POST", body }),
    },
    expenses: {
      list: (query) => shopRequest(`/expenses${queryString(query)}`),
      create: (body) => shopRequest("/expenses", { method: "POST", body }),
      update: (id, body) => shopRequest(`/expenses/${id}`, { method: "PATCH", body }),
      remove: (id) => shopRequest(`/expenses/${id}`, { method: "DELETE" }),
    },
    orders: {
      list: (query) => shopRequest(`/orders${queryString(query)}`),
      get: (id) => shopRequest(`/orders/${id}`),
      nextNumber: () => shopRequest("/orders/next-number"),
      create: (body) => shopRequest("/orders", { method: "POST", body }),
      fulfill: (id) => shopRequest(`/orders/${id}/fulfill`, { method: "POST" }),
      updateStatus: (id, body) => shopRequest(`/orders/${id}/status`, { method: "PATCH", body }),
      cancel: (id, body) => shopRequest(`/orders/${id}/cancel`, { method: "POST", body }),
      remove: (id) => shopRequest(`/orders/${id}`, { method: "DELETE" }),
    },
    pricing: {
      overview: (query) => shopRequest(`/pricing/overview${queryString(query)}`),
      prices: (query) => shopRequest(`/prices${queryString(query)}`),
      createPrice: (body) => shopRequest("/prices", { method: "POST", body }),
      bulkPrices: (body) => shopRequest("/prices/bulk", { method: "POST", body }),
      promotions: (query) => shopRequest(`/promotions${queryString(query)}`),
      createPromotion: (body) => shopRequest("/promotions", { method: "POST", body }),
      updatePromotion: (id, body) => shopRequest(`/promotions/${id}`, { method: "PATCH", body }),
      barcodeLookup: (value, query) => shopRequest(`/barcode-lookup/${encodeURIComponent(value)}${queryString(query)}`),
      barcodes: (query) => shopRequest(`/barcodes${queryString(query)}`),
      createBarcode: (body) => shopRequest("/barcodes", { method: "POST", body }),
      updateBarcode: (id, body) => shopRequest(`/barcodes/${id}`, { method: "PATCH", body }),
      retireBarcode: (id, body) => shopRequest(`/barcodes/${id}/retire`, { method: "PATCH", body }),
      createInternalBarcode: (body) => shopRequest("/barcodes/internal", { method: "POST", body }),
      generateShortCode: () => shopRequest("/barcodes/short-code/generate", { method: "POST" }),
      regenerateBarcode: (id, body) => shopRequest(`/barcodes/${id}/regenerate`, { method: "POST", body }),
      replaceBarcode: (id, body) => shopRequest(`/barcodes/${id}/replace`, { method: "POST", body }),
      barcodeLabel: (id) => shopRequest(`/barcodes/${id}/label.svg`, { responseType: "text" }),
      barcodeLabelUrl: (id) => shopPath(shopId, `/barcodes/${id}/label.svg`),
      reservations: (query) => shopRequest(`/barcode-reservations${queryString(query)}`),
      createReservations: (body) => shopRequest("/barcode-reservations", { method: "POST", body }),
      assignReservation: (id, body) => shopRequest(`/barcode-reservations/${id}/assign`, { method: "POST", body }),
      reservationLabel: (id) => shopRequest(`/barcode-reservations/${id}/label.svg`, { responseType: "text" }),
    },
    audit: (query) => shopRequest(`/audit-logs${queryString(query)}`),
  };
}
