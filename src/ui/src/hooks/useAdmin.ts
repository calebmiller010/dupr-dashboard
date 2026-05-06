import { useState, useEffect, useCallback } from "react";
import { fetchHealth } from "../api";

export function useAdmin() {
  const [adminLocked, setAdminLocked] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [adminSecret, setAdminSecret] = useState<string>(
    () => localStorage.getItem("adminSecret") || "",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then((health) => {
        setAdminLocked(health.admin_locked);
        setReadOnly(health.read_only);
      })
      .catch(() => {
        // If health fails, assume locked down
        setAdminLocked(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const unlock = useCallback((secret: string) => {
    setAdminSecret(secret);
    localStorage.setItem("adminSecret", secret);
  }, []);

  const lock = useCallback(() => {
    setAdminSecret("");
    localStorage.removeItem("adminSecret");
  }, []);

  const isAdmin = !adminLocked || adminSecret !== "";

  return { isAdmin, adminLocked, readOnly, adminSecret, unlock, lock, loading };
}
