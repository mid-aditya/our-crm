const BASE = "/api/v1";

function headers(auth = true): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = localStorage.getItem("access_token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown> & {
    next_cursor?: string | null;
    replies?: unknown[];
    items?: unknown[];
  };
}

async function req<T>(path: string, init?: RequestInit, auth = true): Promise<Envelope<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(auth), ...(init?.headers ?? {}) },
  });
  if (res.status === 401 && auth) {
    localStorage.removeItem("access_token");
    if (location.pathname !== "/login") location.href = "/login";
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body as Envelope<T>;
}

const get = <T>(p: string) => req<T>(p).then((r) => r.data);
const post = <T>(p: string, v?: object) =>
  req<T>(p, { method: "POST", body: JSON.stringify(v ?? {}) }).then((r) => r);
const patch = <T>(p: string, v?: object) =>
  req<T>(p, { method: "PATCH", body: JSON.stringify(v ?? {}) }).then((r) => r.data);
const put = <T>(p: string, v?: object) =>
  req<T>(p, { method: "PUT", body: JSON.stringify(v ?? {}) }).then((r) => r.data);
const del = <T>(p: string) => req<T>(p, { method: "DELETE" }).then((r) => r.data);

export const api = {
  login: (email: string, password: string, company_id?: string) =>
    req<{ access_token: string; refresh_token: string } | { requires_company_selection: boolean; companies: { company_id: string }[] }>(
      "/auth/login", { method: "POST", body: JSON.stringify({ email, password, company_id }) }, false,
    ).then((r) => r.data),

  contacts: (q?: { search?: string; limit?: number; cursor?: string }) => {
    const p = new URLSearchParams();
    if (q?.search) p.set("search", q.search);
    if (q?.limit) p.set("limit", String(q.limit));
    if (q?.cursor) p.set("cursor", q.cursor);
    const s = p.toString();
    return req<unknown[]>(`/contacts${s ? `?${s}` : ""}`).then((r) => ({ list: r.data, cursor: r.meta?.next_cursor ?? null }));
  },
  createContact: (v: object) => post("/contacts", v).then((r) => r.data),
  getContact: (id: string) => get<unknown>(`/contacts/${id}`),
  updateContact: (id: string, v: object) => patch(`/contacts/${id}`, v),
  deleteContact: (id: string) => del(`/contacts/${id}`),

  deals: () => get<unknown[]>("/deals"),
  stages: () => get<{ id: string; name: string }[]>("/deal-stages"),
  createDeal: (v: object) => post("/deals", v).then((r) => r.data),
  updateDeal: (id: string, v: object) => patch(`/deals/${id}`, v),
  deleteDeal: (id: string) => del(`/deals/${id}`),

  activities: () => get<unknown[]>("/activities"),
  createActivity: (v: object) => post("/activities", v).then((r) => r.data),
  completeActivity: (id: string) => patch(`/activities/${id}/complete`, {}),

  // — WhatsApp conversations —
  waChannels: () => get<{ id: string; name: string; type: string; status: string }[]>("/wa-channels"),
  createChannel: (v: object) => post("/wa-channels", v).then((r) => r.data),
  conversations: (status?: string) =>
    get<unknown[]>(`/conversations${status ? `?status=${status}` : ""}`),
  createConversation: (v: object) => post("/conversations", v).then((r) => r.data),
  convMessages: (id: string) => get<unknown[]>(`/conversations/${id}/messages`),
  replyConversation: (id: string, body: string) =>
    post(`/conversations/${id}/reply`, { body }).then((r) => r.data),
  updateConversation: (id: string, v: object) => patch(`/conversations/${id}`, v),

  // — blasting —
  campaigns: () => get<unknown[]>("/campaigns"),
  createCampaign: (v: object) => post("/campaigns", v).then((r) => r.data),
  campaignPreview: (id: string) =>
    req<{ total: number; sample: string }>(`/campaigns/${id}/preview`).then((r) => r.data),
  launchCampaign: (id: string) => post(`/campaigns/${id}/launch`, {}).then((r) => r.data),
  deleteCampaign: (id: string) => del(`/campaigns/${id}`),

  // — tickets —
  tickets: (status?: string) => get<unknown[]>(`/tickets${status ? `?status=${status}` : ""}`),
  createTicket: (v: object) => post("/tickets", v).then((r) => r.data),
  ticketDetail: (id: string) =>
    req<unknown>(`/tickets/${id}`).then((r) => ({ data: r.data, replies: (r.meta?.replies ?? []) as unknown[] })),
  replyTicket: (id: string, body: string) => post(`/tickets/${id}/replies`, { body }).then((r) => r.data),
  updateTicket: (id: string, v: object) => patch(`/tickets/${id}`, v),

  // — reports & performance —
  overview: () => get<Record<string, number>>("/reports/overview"),
  convVolume: () => get<unknown[]>("/reports/conversations"),
  funnel: () => get<unknown>("/reports/funnel"),
  agentStats: () => get<unknown[]>("/reports/agents"),

  // — users & roles —
  users: () => get<unknown[]>("/users"),
  inviteUser: (v: object) => post("/users/invite", v).then((r) => r.data),
  changeRole: (id: string, role_id: string) => patch(`/users/${id}/role`, { role_id }),
  roles: () => get<{ id: string; name: string; isSystemRole: boolean; permissions: string[] }[]>("/roles"),
  updateRolePermissions: (id: string, keys: string[]) => put(`/roles/${id}/permissions`, { permission_keys: keys }),
};
