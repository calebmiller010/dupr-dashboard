import type {
  PlayerAnalytics,
  SyncResult,
  SessionsInfo,
  HealthInfo,
} from "./types";

const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";

function adminHeaders(secret?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (secret) headers["X-Admin-Secret"] = secret;
  return headers;
}

export async function fetchAnalytics(): Promise<PlayerAnalytics> {
  const res = await fetch(`${API_BASE}/api/analytics`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`Health error: ${res.status}`);
  return res.json();
}

export async function triggerSync(adminSecret?: string): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/api/sync`, {
    method: "POST",
    headers: adminHeaders(adminSecret),
  });
  if (!res.ok) throw new Error(`Sync error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function triggerReprocess(
  adminSecret?: string,
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/api/reprocess`, {
    method: "POST",
    headers: adminHeaders(adminSecret),
  });
  if (!res.ok)
    throw new Error(`Reprocess error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function cancelSync(adminSecret?: string): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/api/sync/cancel`, {
    method: "POST",
    headers: adminHeaders(adminSecret),
  });
  if (!res.ok)
    throw new Error(`Cancel error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchSessions(): Promise<SessionsInfo> {
  const res = await fetch(`${API_BASE}/api/sessions`);
  if (!res.ok) throw new Error(`Sessions error: ${res.status}`);
  return res.json();
}

export async function saveSessions(
  annotations: Record<string, { organizer: string; location: string }>,
  adminSecret?: string,
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders(adminSecret) },
    body: JSON.stringify({ annotations }),
  });
  if (!res.ok)
    throw new Error(`Save sessions error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchConfig(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error(`Config error: ${res.status}`);
  return res.json();
}

export async function saveConfig(
  config: Record<string, unknown>,
  adminSecret?: string,
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...adminHeaders(adminSecret) },
    body: JSON.stringify(config),
  });
  if (!res.ok)
    throw new Error(`Save config error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function overwriteSessions(
  data: Record<string, unknown>,
  adminSecret?: string,
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...adminHeaders(adminSecret) },
    body: JSON.stringify(data),
  });
  if (!res.ok)
    throw new Error(`Overwrite sessions error: ${res.status} ${await res.text()}`);
  return res.json();
}
