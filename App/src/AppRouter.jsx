import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { LoadingState } from "./components/ApiState/ApiState";
import RouteErrorBoundary from "./components/RouteErrorBoundary/RouteErrorBoundary";

import App from "./App";
import Home from "./pages/Home/HomePage";
const AuthPage = lazy(() => import("./pages/Auth/AuthPage"));
const Sale = lazy(() => import("./pages/Sale/SalePage"));
const Stock = lazy(() => import("./pages/Stock/StockPage"));
const AddProduct = lazy(() => import("./pages/Stock/AddProductPage"));
const StockHistory = lazy(() => import("./pages/Stock/StockHistoryPage"));
const AddStockMovement = lazy(() => import("./pages/Stock/AddStockMovementPage"));
const ProductDetails = lazy(() => import("./pages/Stock/ProductDetailsPage"));
const Note = lazy(() => import("./pages/Note/NotePage"));
const Payment = lazy(() => import("./pages/Payment/PaymentPage"));
const Price = lazy(() => import("./pages/Price/PricePage"));
const AddPrice = lazy(() => import("./pages/Price/AddPricePage"));
const AddPromotion = lazy(() => import("./pages/Price/AddPromotionPage"));
const PriceHistory = lazy(() => import("./pages/Price/PriceHistoryPage"));
const Report = lazy(() => import("./pages/Report/ReportPage"));
const ProductReport = lazy(() => import("./pages/Report/ProductReportPage"));
const SalesReport = lazy(() => import("./pages/Report/SalesReportPage"));
const SaleRecord = lazy(() => import("./pages/SaleRecord/SaleRecordPage"));
const Suppliers = lazy(() => import("./pages/Suppliers/SuppliersPage"));
const AddSupplier = lazy(() => import("./pages/Suppliers/AddSupplierPage"));
const RecordSupplierPayment = lazy(() => import("./pages/Suppliers/RecordSupplierPaymentPage"));
const SupplierDetails = lazy(() => import("./pages/Suppliers/SupplierDetailsPage"));
const SupplierHistory = lazy(() => import("./pages/Suppliers/SupplierHistoryPage"));
const Settings = lazy(() => import("./pages/Settings/SettingsPage"));
const CategoryManagement = lazy(() => import("./pages/Settings/CategoryManagementPage"));
const PaymentMethodManagement = lazy(() => import("./pages/Settings/PaymentMethodManagementPage"));
const ShopDetailsPage = lazy(() => import("./pages/Settings/ShopDetailsPage"));
const CreateOrder = lazy(() => import("./pages/CreateOrder/CreateOrderPage"));
const OrderDetails = lazy(() => import("./pages/Sale/OrderDetailsPage"));

const router = createBrowserRouter([
  { path: "/login", element: <AuthPage mode="login" />, errorElement: <RouteErrorBoundary /> },
  { path: "/register", element: <AuthPage mode="register" />, errorElement: <RouteErrorBoundary /> },
  {
    path: "/",
    element: <App />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "sale",
        element: <Sale />,
      },
      {
        path: "sale/create",
        element: <CreateOrder />,
      },
      {
        path: "sale/:orderId",
        element: <OrderDetails />,
      },
      {
        path: "stock",
        element: <Stock />,
      },
      { path: "stock/add", element: <AddProduct /> },
      { path: "stock/history", element: <StockHistory /> },
      { path: "stock/movement/add", element: <AddStockMovement /> },
      { path: "stock/:productId", element: <ProductDetails /> },
      { path: "note", element: <Note /> },
      { path: "payment", element: <Payment /> },
      { path: "payment/history", element: <SupplierHistory /> },
      { path: "price", element: <Price /> },
      { path: "price/add", element: <AddPrice /> },
      { path: "price/promotion/add", element: <AddPromotion /> },
      { path: "price/history", element: <PriceHistory /> },
      { path: "report", element: <Report /> },
      { path: "report/products", element: <ProductReport /> },
      { path: "report/sales", element: <SalesReport /> },
      { path: "sale-record", element: <SaleRecord /> },
      { path: "suppliers", element: <Suppliers /> },
      { path: "suppliers/add", element: <AddSupplier /> },
      { path: "suppliers/history", element: <SupplierHistory /> },
      { path: "suppliers/:supplierId/pay", element: <RecordSupplierPayment /> },
      { path: "suppliers/:supplierId", element: <SupplierDetails /> },
      { path: "settings", element: <Settings /> },
      { path: "settings/categories", element: <CategoryManagement /> },
      { path: "settings/payment-methods", element: <PaymentMethodManagement /> },
      { path: "settings/shop-details", element: <ShopDetailsPage /> },
    ],
  },
]);
export default function AppRouter() {
  return <Suspense fallback={<LoadingState minHeight="100vh" />}><RouterProvider router={router} /></Suspense>;
}
