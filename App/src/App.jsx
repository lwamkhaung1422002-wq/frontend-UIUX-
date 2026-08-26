import AppLayout from "./layouts/AppLayout/AppLayout";
import { Navigate, useLocation } from "react-router";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { isAuthenticated, authReady, sessionExpired } = useAuth();
  const location = useLocation();
  if (!authReady) return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location, sessionExpired }} />;
  return <AppLayout />;
}
