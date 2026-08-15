import { createContext, useContext } from "react";

export const AppPreferenceContext = createContext(null);
export const useAppPreferences = () => useContext(AppPreferenceContext);
