import { Box, Container, useMediaQuery } from "@mui/material";
import { Outlet, useLocation } from "react-router";
import Header from "../../components/Header/Header";
import AppDrawer from "../../components/AppDrawer/AppDrawer";
import MobileBottomNavigation from "../../components/MobileBottomNavigation/MobileBottomNavigation";

export default function AppLayout() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const { pathname } = useLocation();
  const isFullscreenMobilePage = pathname === "/sale/create" || pathname.startsWith("/stock/") || pathname === "/suppliers" || pathname.startsWith("/suppliers/") || pathname === "/payment" || pathname.startsWith("/payment/") || pathname === "/price" || pathname.startsWith("/price/") || pathname.startsWith("/settings/");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isMobile ? "#f8fafc" : "background.default" }}>
      <AppDrawer />
      <Box sx={{ ml: isMobile ? 0 : "260px", minHeight: "100vh" }}>
        <Header />
        <Container component="main" maxWidth={false} disableGutters={isMobile} sx={{ py: isMobile ? 0 : 4, px: isMobile ? 0 : { md: 4, lg: 5 }, pb: isMobile ? "88px" : 4 }}>
          <Outlet />
        </Container>
      </Box>
      {!isFullscreenMobilePage && <MobileBottomNavigation />}
    </Box>
  );
}
