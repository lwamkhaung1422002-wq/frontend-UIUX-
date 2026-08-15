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

export function createPosApi({ token, shopId, onUnauthorized }) {
  const request = async (path, options) => {
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
      create: (body) => shopRequest("/products", { method: "POST", body }),
      update: (id, body) => shopRequest(`/products/${id}`, { method: "PATCH", body }),
      remove: (id) => shopRequest(`/products/${id}`, { method: "DELETE" }),
    },
    inventory: {
      list: (query) => shopRequest(`/inventory${queryString(query)}`),
      create: (body) => shopRequest("/inventory", { method: "POST", body }),
      adjustments: (query) => shopRequest(`/inventory-adjustments${queryString(query)}`),
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
    },
    audit: (query) => shopRequest(`/audit-logs${queryString(query)}`),
  };
}
