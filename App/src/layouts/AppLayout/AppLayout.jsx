import { Container } from "@mui/material";
import { Outlet } from "react-router";
import Header from "../../components/Header/Header";
import AppDrawer from "../../components/AppDrawer/AppDrawer";
import "./AppLayout.css";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Header />
      <AppDrawer />
      <Container className="app-layout__content" sx={{ mt: 2 }} maxWidth={false} disableGutters>
        <Outlet />
      </Container>
    </div>
  );
}
