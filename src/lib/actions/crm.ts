"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  contactSchema,
  dealSchema,
  taskSchema,
} from "@/lib/validations/contact.schema";
import type { ContactInsert, DealInsert, TaskInsert } from "@/types/database";

// ─── CONTACTS ───

export async function createContact(data: ContactInsert) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const safe = parsed.data as {
    name: string;
    whatsapp_number?: string | null;
    email?: string | null;
    notes?: string | null;
  };

  const wa = safe.whatsapp_number
    ? `+62${safe.whatsapp_number.replace(/\D/g, "").replace(/^(62|0)/, "")}`
    : null;

  const { data: result, error } = await (supabase as any)
    .from("contacts")
    .insert({
      team_id: data.team_id,
      name: safe.name,
      whatsapp_number: wa,
      email: safe.email || null,
      notes: safe.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function updateContact(id: string, input: Partial<ContactInsert>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: result, error } = await (supabase as any)
    .from("contacts")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return result;
}

export async function deleteContact(id: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await (supabase as any)
    .from("contacts")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

// ─── DEALS ───

export async function createDeal(data: DealInsert) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: result, error } = await (supabase as any)
    .from("deals")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return result;
}

export async function updateDealStage(id: string, stage: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const updates: Record<string, unknown> = { stage };
  if (stage === "deal") updates.closed_at = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from("deals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── TASKS ───

export async function createTask(data: TaskInsert) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: result, error } = await (supabase as any)
    .from("tasks")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return result;
}

export async function toggleTaskStatus(id: string, status: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const updates: Record<string, unknown> = { status };
  if (status === "done") updates.completed_at = new Date().toISOString();
  else updates.completed_at = null;

  const { data, error } = await (supabase as any)
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
