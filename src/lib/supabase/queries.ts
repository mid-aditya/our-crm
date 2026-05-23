import { createClient } from "./client";
import type {
  ContactInsert,
  DealInsert,
  TaskInsert,
  ContactUpdate,
  DealUpdate,
  TaskUpdate,
} from "@/types/database";

// ─── HELPERS ───

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+${digits}`;
}

// ─── CONTACTS ───

export const contacts = {
  getAll: async (
    teamId: string,
    filters?: { label?: string; search?: string },
  ) => {
    const supabase = createClient();
    let query = supabase.from("contacts").select("*").eq("team_id", teamId);

    if (filters?.label) query = query.contains("label", [filters.label]);
    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `name.ilike.${term},email.ilike.${term},whatsapp_number.ilike.${term}`,
      );
    }

    return query.order("created_at", { ascending: false });
  },

  getById: async (id: string) => {
    const supabase = createClient();
    return supabase.from("contacts").select("*").eq("id", id).single();
  },

  create: async (data: ContactInsert) => {
    const supabase = createClient();
    const wa = data.whatsapp_number ? formatPhone(data.whatsapp_number) : null;
    return (supabase as any)
      .from("contacts")
      .insert({ ...data, whatsapp_number: wa })
      .select()
      .single();
  },

  update: async (id: string, data: ContactUpdate) => {
    const supabase = createClient();
    const updates = { ...data };
    if (updates.whatsapp_number)
      updates.whatsapp_number = formatPhone(updates.whatsapp_number);
    return (supabase as any)
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
  },

  remove: async (id: string) => {
    const supabase = createClient();
    return (supabase as any).from("contacts").delete().eq("id", id);
  },
};

// ─── DEALS ───

export const deals = {
  getAll: async (teamId: string) => {
    const supabase = createClient();
    return supabase
      .from("deals")
      .select("*, contact:contact_id(*)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });
  },

  create: async (data: DealInsert) => {
    const supabase = createClient();
    return (supabase as any).from("deals").insert(data).select().single();
  },

  update: async (id: string, data: DealUpdate) => {
    const supabase = createClient();
    return (supabase as any)
      .from("deals")
      .update(data)
      .eq("id", id)
      .select()
      .single();
  },

  updateStage: async (id: string, stage: string) => {
    const supabase = createClient();
    const updates: Record<string, unknown> = { stage };
    if (stage === "deal") updates.closed_at = new Date().toISOString();
    return (supabase as any)
      .from("deals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
  },

  remove: async (id: string) => {
    const supabase = createClient();
    return (supabase as any).from("deals").delete().eq("id", id);
  },
};

// ─── TASKS ───

export const tasks = {
  getAll: async (teamId: string) => {
    const supabase = createClient();
    return supabase
      .from("tasks")
      .select("*, contact:contact_id(name), deal:deal_id(title)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });
  },

  create: async (data: TaskInsert) => {
    const supabase = createClient();
    return (supabase as any).from("tasks").insert(data).select().single();
  },

  update: async (id: string, data: TaskUpdate) => {
    const supabase = createClient();
    return (supabase as any)
      .from("tasks")
      .update(data)
      .eq("id", id)
      .select()
      .single();
  },

  toggleStatus: async (id: string, status: TaskUpdate["status"]) => {
    const supabase = createClient();
    const updates: Record<string, unknown> = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    return (supabase as any)
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
  },

  remove: async (id: string) => {
    const supabase = createClient();
    return (supabase as any).from("tasks").delete().eq("id", id);
  },
};

// ─── SETTINGS ───

export const settings = {
  getByKey: async (key: string) => {
    const supabase = createClient();
    return supabase.from("settings").select("value").eq("key", key).single();
  },
};

// ─── ACTIVITY LOGS ───

export const activityLogs = {
  getAll: async (teamId: string, limit = 20) => {
    const supabase = createClient();
    return supabase
      .from("activity_logs")
      .select("*, actor:actor_id(full_name)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(limit);
  },
};
