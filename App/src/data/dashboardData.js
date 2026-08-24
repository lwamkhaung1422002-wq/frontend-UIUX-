export const demoOrders = [];

export const demoExpenses = [];

export const inventorySummary = {
  lowStockItems: 0,
  totalProducts: 0,
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
