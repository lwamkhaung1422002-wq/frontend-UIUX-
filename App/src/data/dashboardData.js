export const demoOrders = [
  { id: "ORD-20260811-0001", amount: 15000, time: "09:10 AM", date: "2026-08-11", status: "Done", paymentStatus: "Paid" },
  { id: "ORD-20260811-0002", amount: 22000, time: "10:35 AM", date: "2026-08-11", status: "Done", paymentStatus: "Paid" },
  { id: "ORD-20260811-0003", amount: 18500, time: "12:05 PM", date: "2026-08-11", status: "Done", paymentStatus: "Paid" },
  { id: "ORD-20260811-0004", amount: 32000, time: "02:20 PM", date: "2026-08-11", status: "Done", paymentStatus: "Paid" },
  { id: "ORD-20260811-0005", amount: 27000, time: "04:40 PM", date: "2026-08-11", status: "Done", paymentStatus: "Paid" },
];

export const demoExpenses = [];

export const inventorySummary = {
  lowStockItems: 0,
  totalProducts: 1,
};

export function getDashboardSummary() {
  const todaySales = demoOrders.reduce((total, order) => total + order.amount, 0);
  const todayExpense = demoExpenses.reduce((total, expense) => total + expense.amount, 0);

  return {
    todaySales,
    todayExpense,
    todayProfit: todaySales - todayExpense,
    ...inventorySummary,
  };
}
