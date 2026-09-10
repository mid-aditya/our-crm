const BASE = "/api/v1";

function headers(auth = true): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = localStorage.getItem("access_token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

async function req<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers(auth), ...(init?.headers ?? {}) } });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body.data as T;
}

export const api = {
  login: (email: string, password: string, company_id?: string) =>
    req<{ access_token: string; refresh_token: string } | { requires_company_selection: boolean; companies: { company_id: string }[] }>(
      "/auth/login", { method: "POST", body: JSON.stringify({ email, password, company_id }) }, false,
    ),
  contacts: () => req<unknown[]>("/contacts"),
  createContact: (v: object) => req("/contacts", { method: "POST", body: JSON.stringify(v) }),
  deals: () => req<unknown[]>("/deals"),
  stages: () => req<unknown[]>("/deal-stages"),
  activities: () => req<unknown[]>("/activities"),
};
