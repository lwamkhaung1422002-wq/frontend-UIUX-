import { createBrowserRouter, RouterProvider } from "react-router";

import App from "./App";
import Home from "./pages/Home/HomePage";
import Sale from "./pages/Sale/SalePage";
import Stock from "./pages/Stock/StockPage";
import AddProduct from "./pages/Stock/AddProductPage";
import StockHistory from "./pages/Stock/StockHistoryPage";
import AddStockMovement from "./pages/Stock/AddStockMovementPage";
import ProductDetails from "./pages/Stock/ProductDetailsPage";
import Note from "./pages/Note/NotePage";
import Payment from "./pages/Payment/PaymentPage";
import Price from "./pages/Price/PricePage";
import AddPrice from "./pages/Price/AddPricePage";
import AddPromotion from "./pages/Price/AddPromotionPage";
import PriceHistory from "./pages/Price/PriceHistoryPage";
import Report from "./pages/Report/ReportPage";
import SaleRecord from "./pages/SaleRecord/SaleRecordPage";
import Suppliers from "./pages/Suppliers/SuppliersPage";
import AddSupplier from "./pages/Suppliers/AddSupplierPage";
import RecordSupplierPayment from "./pages/Suppliers/RecordSupplierPaymentPage";
import SupplierDetails from "./pages/Suppliers/SupplierDetailsPage";
import SupplierHistory from "./pages/Suppliers/SupplierHistoryPage";
import Settings from "./pages/Settings/SettingsPage";
import CategoryManagement from "./pages/Settings/CategoryManagementPage";
import PaymentMethodManagement from "./pages/Settings/PaymentMethodManagementPage";
import ShopDetailsPage from "./pages/Settings/ShopDetailsPage";
import CreateOrder from "./pages/CreateOrder/CreateOrderPage";
import OrderDetails from "./pages/Sale/OrderDetailsPage";
import AuthPage from "./pages/Auth/AuthPage";

const router = createBrowserRouter([
  { path: "/login", element: <AuthPage mode="login" /> },
  { path: "/register", element: <AuthPage mode="register" /> },
  {
    path: "/",
    element: <App />,
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
  return <RouterProvider router={router} />;
}
