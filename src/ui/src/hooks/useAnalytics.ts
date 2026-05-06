import { useState, useEffect } from "react";
import type { PlayerAnalytics } from "../types";
import { fetchAnalytics } from "../api";

export function useAnalytics() {
  const [data, setData] = useState<PlayerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const analytics = await fetchAnalytics();
      setData(analytics);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { data, loading, error, reload: load };
}
