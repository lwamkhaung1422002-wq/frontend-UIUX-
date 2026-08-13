import { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AppRouter from "./AppRouter";

const AppPreferenceContext = createContext(null);
export const useAppPreferences = () => useContext(AppPreferenceContext);

export default function AppProvider() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("pos-theme-mode") || "light");
  const [shop, setShopState] = useState(() => JSON.parse(localStorage.getItem("pos-shop-details") || '{"name":"POS System","address":"","logo":""}'));
  const setMode = (mode) => { setThemeMode(mode); localStorage.setItem("pos-theme-mode", mode); };
  const setShop = (nextShop) => { setShopState(nextShop); localStorage.setItem("pos-shop-details", JSON.stringify(nextShop)); };
  const theme = useMemo(() => createTheme({ palette: { mode: themeMode, primary: { main: "#1976d2", dark: "#1565c0" }, background: { default: themeMode === "dark" ? "#101827" : "#f8fafc" } } }), [themeMode]);
  return <AppPreferenceContext.Provider value={{ themeMode, setThemeMode: setMode, shop, setShop }}><ThemeProvider theme={theme}><CssBaseline /><AppRouter /></ThemeProvider></AppPreferenceContext.Provider>;
}
