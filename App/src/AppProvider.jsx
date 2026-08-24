import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import AppRouter from "./AppRouter";
import { AppPreferenceContext } from "./context/AppPreferenceContext";
import { AuthContext } from "./context/AuthContext";
import { apiRequest } from "./lib/api";

const sessionStorageKey = "pos:api-session";

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionStorageKey) || "null");
  } catch {
    return null;
  }
}

export default function AppProvider() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("pos-theme-mode") || "light");
  const [shop, setShopState] = useState(() => JSON.parse(localStorage.getItem("pos-shop-details") || '{"name":"POS System","address":"","logo":""}'));
  const [session, setSession] = useState(readSession);
  const [authReady, setAuthReady] = useState(false);
  const [registrationPromptOpen, setRegistrationPromptOpen] = useState(false);
  const setMode = useCallback((mode) => { setThemeMode(mode); localStorage.setItem("pos-theme-mode", mode); }, []);
  const setShop = useCallback((nextShop) => { setShopState(nextShop); localStorage.setItem("pos-shop-details", JSON.stringify(nextShop)); }, []);
  const saveSession = useCallback((nextSession) => {
    setSession(nextSession);
    localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    if (nextSession.shop) setShop({ name: nextSession.shop.name, address: nextSession.shop.address || "", logo: nextSession.shop.logoUrl || "" });
  }, [setShop]);
  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem(sessionStorageKey);
  }, []);
  const continueAsGuest = useCallback(() => {
    const guestSession = { mode: "guest" };
    setSession(guestSession);
    localStorage.setItem(sessionStorageKey, JSON.stringify(guestSession));
  }, []);
  const authenticate = useCallback(async (path, body) => {
    const result = await apiRequest(path, { method: "POST", body });
    const selectedShop = result.shop || result.user?.shops?.[0];
    if (!result.token || !selectedShop) throw new Error("Your account does not have a shop yet.");
    saveSession({ token: result.token, user: result.user, shop: selectedShop });
    return result;
  }, [saveSession]);
  const login = useCallback((credentials) => authenticate("/auth/login", credentials), [authenticate]);
  const register = useCallback((details) => authenticate("/auth/register", details), [authenticate]);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      if (session?.mode === "guest" || !session?.token) {
        if (active) setAuthReady(true);
        return;
      }
      try {
        const result = await apiRequest("/auth/me", { token: session.token });
        const selectedShop = result.user?.shops?.find((item) => item.id === session.shop?.id) || result.user?.shops?.[0];
        if (!selectedShop) throw new Error("No shop found.");
        if (active) saveSession({ token: session.token, user: result.user, shop: selectedShop });
      } catch {
        if (active) logout();
      } finally {
        if (active) setAuthReady(true);
      }
    };
    restoreSession();
    return () => { active = false; };
  }, [logout, saveSession, session?.mode, session?.shop?.id, session?.token]);
  const theme = useMemo(() => createTheme({ palette: { mode: themeMode, primary: { main: "#1976d2", dark: "#1565c0" }, background: { default: themeMode === "dark" ? "#101827" : "#f8fafc" } } }), [themeMode]);
  const auth = useMemo(() => ({ session, user: session?.user || null, shop: session?.shop || null, token: session?.token || null, isGuest: session?.mode === "guest", isAuthenticated: Boolean(session?.token || session?.mode === "guest"), authReady, login, register, logout, continueAsGuest, requestRegistration: () => setRegistrationPromptOpen(true), selectShop: (nextShop) => saveSession({ ...session, shop: nextShop }) }), [session, authReady, login, register, logout, continueAsGuest, saveSession]);
  const guardGuestAction = (event) => {
    if (session?.mode !== "guest") return;
    const button = event.target.closest("button");
    const label = button?.textContent?.trim().replace(/\s+/g, " ") || "";
    if (/^(Save|Update Shop|Delete|Delete order|Record Payment|Save Payment|Order Completed|Apply Price|Create Promotion|Create Product|Add Stock)$/i.test(label)) {
      event.preventDefault();
      event.stopPropagation();
      setRegistrationPromptOpen(true);
    }
  };
  return <AppPreferenceContext.Provider value={{ themeMode, setThemeMode: setMode, shop, setShop }}><AuthContext.Provider value={auth}><ThemeProvider theme={theme}><CssBaseline /><div onClickCapture={guardGuestAction}><AppRouter /></div><Dialog open={registrationPromptOpen} onClose={() => setRegistrationPromptOpen(false)} fullWidth maxWidth="xs"><DialogTitle fontWeight={800}>Create an account to save</DialogTitle><DialogContent><Typography color="text.secondary">Guest mode lets you explore General POS. Create an account before saving stock, orders, payments, or other business records.</Typography></DialogContent><DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setRegistrationPromptOpen(false)}>Continue exploring</Button><Button variant="contained" onClick={() => { window.location.assign("/register"); }}>Create account</Button></DialogActions></Dialog></ThemeProvider></AuthContext.Provider></AppPreferenceContext.Provider>;
}
