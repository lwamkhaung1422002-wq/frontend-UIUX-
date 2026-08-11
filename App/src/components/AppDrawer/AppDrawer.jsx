import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
} from "@mui/material";

import {
  Home as HomeIcon,
  PointOfSale as SaleIcon,
  Inventory2Outlined as StockIcon,
} from "@mui/icons-material";

import { grey } from "@mui/material/colors";
import { useApp } from "../../hooks/useApp";
import { useNavigate } from "react-router";
import "./AppDrawer.css";

export default function AppDrawer() {
  const { openDrawer, setOpenDrawer } = useApp();
  const navigate = useNavigate();

  return (
    <Drawer
      open={openDrawer}
      onClick={() => setOpenDrawer(false)}
      onClose={() => setOpenDrawer(false)}
    >
      <Box sx={{ width: 250, px: 2.5, py: 3, background: grey[900], color: "white" }}>
        <strong>General Store</strong>
      </Box>
      <List>
        <ListItem>
          <ListItemButton onClick={() => navigate("/")}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
      </List>
      <List>
        <ListItemButton onClick={() => navigate("/sale")}>
          <ListItemIcon>
            <SaleIcon />
          </ListItemIcon>
          <ListItemText primary="Sales counter" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate("/stock")}>
          <ListItemIcon>
            <StockIcon />
          </ListItemIcon>
          <ListItemText primary="Inventory" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
