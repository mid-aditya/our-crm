export type UserRole = 'owner' | 'admin' | 'sales';

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface Contact {
    id: string;
    name: string;
    whatsapp_number: string | null;
    email: string | null;
    label: string | null;
    notes: string | null;
    created_at: string;
}

export interface Deal {
    id: string;
    contact_id: string;
    title: string;
    value: number;
    stage: string;
    reminder_at: string | null;
    created_at: string;
    updated_at: string;
    contact?: Contact;
}

export interface Task {
    id: string;
    contact_id: string;
    deal_id: string | null;
    practitioner_id: string;
    pic_id: string;
    description: string;
    due_date: string | null;
    status: 'pending' | 'completed';
    created_at: string;
}
