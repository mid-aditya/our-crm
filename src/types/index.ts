// Canonical CRM types
// These match the Supabase schema in @/types/database

export type UserRole = "owner" | "admin" | "sales" | "support";

export type DealStage =
  | "chat_masuk"
  | "tertarik"
  | "ditawar"
  | "deal"
  | "batal";

export interface Contact {
  id: string;
  team_id: string;
  name: string;
  whatsapp_number: string | null;
  email: string | null;
  label: string[] | null;
  source: string | null;
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  team_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  assigned_to: string | null;
  reminder_at: string | null;
  closed_at: string | null;
  created_at: string;
  contact?: Contact | null;
}

export interface Task {
  id: string;
  team_id: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "urgent";
  status: "todo" | "in_progress" | "done" | "cancelled";
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team_id: string | null;
}
