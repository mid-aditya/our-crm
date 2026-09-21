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
    items?: unknown[];
    payments?: unknown[];
    subtotal?: number;
    tax?: number;
    total?: number;
    paid?: number;
    balance?: number;
    planned?: number;
    actual?: number;
    remaining?: number;
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
  // — auth —
  login: (email: string, password: string, company_id?: string) =>
    req<{ access_token: string; refresh_token: string } | { requires_company_selection: boolean; companies: { company_id: string }[] }>(
      "/auth/login", { method: "POST", body: JSON.stringify({ email, password, company_id }) }, false,
    ).then((r) => r.data),
  logout: (refresh_token: string, company_id: string) =>
    post("/auth/logout", { refresh_token, company_id }),

  // — contacts —
  contacts: (q?: { search?: string; limit?: number; cursor?: string }) => {
    const p = new URLSearchParams();
    if (q?.search) p.set("search", q.search);
    if (q?.limit) p.set("limit", String(q.limit));
    if (q?.cursor) p.set("cursor", q.cursor);
    const s = p.toString();
    return req<unknown[]>(`/contacts${s ? `?${s}` : ""}`).then((r) => ({ list: r.data, cursor: r.meta?.next_cursor ?? null }));
  },
  createContact: (v: object) => post("/contacts", v).then((r) => r.data),
  updateContact: (id: string, v: object) => patch(`/contacts/${id}`, v),
  deleteContact: (id: string) => del(`/contacts/${id}`),

  // — deals —
  deals: () => get<unknown[]>("/deals"),
  stages: () => get<{ id: string; name: string; orderIndex: number; isWonStage: boolean; isLostStage: boolean }[]>("/deal-stages"),
  createDeal: (v: object) => post("/deals", v).then((r) => r.data),
  updateDeal: (id: string, v: object) => patch(`/deals/${id}`, v),
  deleteDeal: (id: string) => del(`/deals/${id}`),

  // — activities —
  activities: () => get<unknown[]>("/activities"),
  createActivity: (v: object) => post("/activities", v).then((r) => r.data),
  completeActivity: (id: string) => patch(`/activities/${id}/complete`, {}),

  // — clients / org —
  organizations: () => get<unknown[]>("/organizations"),
  createOrganization: (v: object) => post("/organizations", v).then((r) => r.data),
  deleteOrganization: (id: string) => del(`/organizations/${id}`),
  departments: () => get<unknown[]>("/departments"),
  createDepartment: (v: object) => post("/departments", v).then((r) => r.data),

  // — projects & tasks —
  projects: () => get<unknown[]>("/projects"),
  createProject: (v: object) => post("/projects", v).then((r) => r.data),
  projectTasks: (id: string) => get<unknown[]>(`/projects/${id}/tasks`),
  createProjectTask: (id: string, v: object) => post(`/projects/${id}/tasks`, v).then((r) => r.data),
  updateProjectTask: (id: string, v: object) => patch(`/project-tasks/${id}`, v),
  projectBudgets: (id: string) =>
    req<unknown[]>(`/projects/${id}/budgets`).then((r) => ({ list: r.data, meta: r.meta })),
  createBudget: (id: string, v: object) => post(`/projects/${id}/budgets`, v).then((r) => r.data),
  addMember: (id: string, v: object) => post(`/projects/${id}/members`, v).then((r) => r.data),

  // — invoices —
  invoices: () => get<unknown[]>("/invoices"),
  createInvoice: (v: object) => post("/invoices", v).then((r) => r.data),
  invoiceDetail: (id: string) => req<unknown>(`/invoices/${id}`).then((r) => ({ data: r.data, meta: r.meta })),
  payInvoice: (id: string, v: object) => post(`/invoices/${id}/payments`, v).then((r) => r.data),
  invoiceStatus: (id: string, status: string) => patch(`/invoices/${id}/status`, { status }),

  // — employees & time —
  employees: () => get<unknown[]>("/employees"),
  createEmployee: (v: object) => post("/employees", v).then((r) => r.data),
  clockIn: (v: object) => post("/time-entries/clock-in", v).then((r) => r.data),
  clockOut: (id: string) => post(`/time-entries/${id}/clock-out`, {}).then((r) => r.data),
  employeeActivities: (id: string) => get<unknown[]>(`/employees/${id}/activities`),
  productivity: () => get<unknown>("/reports/productivity"),

  // — accounting —
  ledger: () => get<unknown[]>("/ledger-accounts"),
  createAccount: (v: object) => post("/ledger-accounts", v).then((r) => r.data),
  postJournal: (v: object) => post("/journal", v).then((r) => r.data),
  trialBalance: () => get<unknown[]>("/trial-balance"),

  // — users & roles —
  users: () => get<unknown[]>("/users"),
  inviteUser: (v: object) => post("/users/invite", v).then((r) => r.data),
  changeRole: (id: string, role_id: string) => patch(`/users/${id}/role`, { role_id }),
  roles: () => get<{ id: string; name: string; isSystemRole: boolean; permissions: string[] }[]>("/roles"),
  updateRolePermissions: (id: string, keys: string[]) => put(`/roles/${id}/permissions`, { permission_keys: keys }),
};
