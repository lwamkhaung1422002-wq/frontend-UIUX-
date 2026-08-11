import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useState, useMemo } from "react";

import AppRouter from "./AppRouter";
import { AppContext } from "./hooks/useApp";

export default function AppProvider() {
  const [mode, setMode] = useState("light");
  const [openDrawer, setOpenDrawer] = useState(false);

  const theme = useMemo(() => {
    return createTheme({ palette: { mode } });
  }, [mode]);
  return (
    <AppContext.Provider value={{ mode, setMode, openDrawer, setOpenDrawer }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRouter />
      </ThemeProvider>
    </AppContext.Provider>
  );
}
