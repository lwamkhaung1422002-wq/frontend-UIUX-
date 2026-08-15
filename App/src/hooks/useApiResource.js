import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createPosApi } from "../services/posApi";

export function usePosApi() {
  const { token, shop, logout } = useAuth();
  return useMemo(() => createPosApi({ token, shopId: shop?.id, onUnauthorized: logout }), [token, shop?.id, logout]);
}

export function useApiResource(load) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await load();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
      throw error;
    }
  }, [load]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { ...state, reload };
}
