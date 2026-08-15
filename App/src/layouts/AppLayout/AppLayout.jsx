import { Box, Container, useMediaQuery } from "@mui/material";
import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import Header from "../../components/Header/Header";
import AppDrawer from "../../components/AppDrawer/AppDrawer";
import MobileBottomNavigation from "../../components/MobileBottomNavigation/MobileBottomNavigation";

export default function AppLayout() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const { pathname } = useLocation();
  const isFullscreenMobilePage = pathname.startsWith("/sale/") || pathname.startsWith("/stock/") || pathname === "/suppliers" || pathname.startsWith("/suppliers/") || pathname === "/payment" || pathname.startsWith("/payment/") || pathname === "/price" || pathname.startsWith("/price/") || pathname.startsWith("/settings/");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isMobile ? "#f8fafc" : "background.default" }}>
      <AppDrawer expanded={drawerExpanded} setExpanded={setDrawerExpanded} />
      <Box sx={{ ml: isMobile ? 0 : drawerExpanded ? "220px" : "76px", minHeight: "100vh", transition: "margin-left 180ms ease" }}>
        <Header />
        <Container component="main" maxWidth={false} disableGutters={isMobile} sx={{ pt: isMobile ? 0 : 1.5, px: isMobile ? 0 : { md: 3, lg: 3 }, pb: isMobile ? "88px" : 2 }}>
          <Outlet />
        </Container>
      </Box>
      {!isFullscreenMobilePage && <MobileBottomNavigation />}
    </Box>
  );
}
