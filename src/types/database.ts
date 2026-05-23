// Database types - generated from Supabase schema
// Run `npx supabase gen types typescript --project-id your-project-id` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'admin' | 'sales' | 'support'

export type DealStage = 'chat_masuk' | 'tertarik' | 'ditawar' | 'deal' | 'batal'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'urgent'

export type MessageDirection = 'inbound' | 'outbound'

export type MessageChannel = 'whatsapp' | 'email' | 'sms'

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'

export type CampaignChannel = 'whatsapp' | 'email' | 'sms' | 'rcs'

// Database schemas
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: UserRole
          team_id: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          role?: UserRole
          team_id?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          team_id?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          whatsapp_business_id: string | null
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          whatsapp_business_id?: string | null
          settings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          whatsapp_business_id?: string | null
          settings?: Json
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          team_id: string
          name: string
          whatsapp_number: string | null
          email: string | null
          label: string[] | null
          source: string | null
          notes: string | null
          last_activity_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          whatsapp_number?: string | null
          email?: string | null
          label?: string[] | null
          source?: string | null
          notes?: string | null
          last_activity_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          whatsapp_number?: string | null
          email?: string | null
          label?: string[] | null
          source?: string | null
          notes?: string | null
          last_activity_at?: string | null
          created_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          team_id: string
          contact_id: string | null
          title: string
          value: number
          currency: string
          stage: DealStage
          assigned_to: string | null
          reminder_at: string | null
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          contact_id?: string | null
          title: string
          value?: number
          currency?: string
          stage?: DealStage
          assigned_to?: string | null
          reminder_at?: string | null
          closed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          contact_id?: string | null
          title?: string
          value?: number
          currency?: string
          stage?: DealStage
          assigned_to?: string | null
          reminder_at?: string | null
          closed_at?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          team_id: string
          contact_id: string | null
          deal_id: string | null
          title: string
          description: string | null
          priority: TaskPriority
          status: TaskStatus
          due_date: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          contact_id?: string | null
          deal_id?: string | null
          title: string
          description?: string | null
          priority?: TaskPriority
          status?: TaskStatus
          due_date?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          contact_id?: string | null
          deal_id?: string | null
          title?: string
          description?: string | null
          priority?: TaskPriority
          status?: TaskStatus
          due_date?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          team_id: string
          name: string
          channel: CampaignChannel
          message_template: string | null
          audience_filter: Json | null
          scheduled_at: string | null
          status: CampaignStatus
          stats: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          channel: CampaignChannel
          message_template?: string | null
          audience_filter?: Json | null
          scheduled_at?: string | null
          status?: CampaignStatus
          stats?: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          channel?: CampaignChannel
          message_template?: string | null
          audience_filter?: Json | null
          scheduled_at?: string | null
          status?: CampaignStatus
          stats?: Json
          created_by?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          team_id: string
          contact_id: string | null
          direction: MessageDirection
          channel: MessageChannel
          content: string
          media_url: string[] | null
          status: MessageStatus
          external_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          contact_id?: string | null
          direction: MessageDirection
          channel: MessageChannel
          content: string
          media_url?: string[] | null
          status?: MessageStatus
          external_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          contact_id?: string | null
          direction?: MessageDirection
          channel?: MessageChannel
          content?: string
          media_url?: string[] | null
          status?: MessageStatus
          external_message_id?: string | null
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          team_id: string
          actor_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          actor_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']

// Insert types
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type DealInsert = Database['public']['Tables']['deals']['Insert']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']

// Update types
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']
export type DealUpdate = Database['public']['Tables']['deals']['Update']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']
