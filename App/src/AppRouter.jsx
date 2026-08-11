import { createBrowserRouter, RouterProvider } from "react-router";

import App from "./App";
import Home from "./pages/Home/HomePage";
import Sale from "./pages/Sale/SalePage";
import Stock from "./pages/Stock/StockPage";
import Note from "./pages/Note/NotePage";
import Payment from "./pages/Payment/PaymentPage";
import Price from "./pages/Price/PricePage";
import Report from "./pages/Report/ReportPage";
import SaleRecord from "./pages/SaleRecord/SaleRecordPage";
import Suppliers from "./pages/Suppliers/SuppliersPage";

const router = createBrowserRouter([
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
        path: "stock",
        element: <Stock />,
      },
      { path: "note", element: <Note /> },
      { path: "payment", element: <Payment /> },
      { path: "price", element: <Price /> },
      { path: "report", element: <Report /> },
      { path: "sale-record", element: <SaleRecord /> },
      { path: "suppliers", element: <Suppliers /> },
    ],
  },
]);
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
