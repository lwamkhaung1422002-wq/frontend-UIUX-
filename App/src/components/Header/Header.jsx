import { AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import {
  Menu as MenuIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";

import { useApp } from "../../hooks/useApp";
import { useLocation, useNavigate } from "react-router";
import "./Header.css";

export default function Header() {
  const { mode, setMode, setOpenDrawer } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <AppBar position="static">
      <Toolbar>
        {pathname == "/" ? (
          <IconButton onClick={() => setOpenDrawer(true)}>
            <MenuIcon />
          </IconButton>
        ) : (
          <IconButton onClick={() => navigate("/")}>
            <BackIcon />
          </IconButton>
        )}
        <Typography sx={{ flexGrow: 1 }}>Social App</Typography>
        {mode == "light" ? (
          <IconButton onClick={() => setMode("dark")}>
            <DarkModeIcon />
          </IconButton>
        ) : (
          <IconButton onClick={() => setMode("light")}>
            <LightModeIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
}
