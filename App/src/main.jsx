import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/noto-sans-myanmar/400.css";
import "@fontsource/noto-sans-myanmar/500.css";
import "@fontsource/noto-sans-myanmar/600.css";
import "@fontsource/noto-sans-myanmar/700.css";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";

import AppProvider from "./AppProvider";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider />
  </StrictMode>,
);
