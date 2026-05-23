import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  whatsapp_number: z
    .string()
    .regex(/^(0|62|\+62|62)8\d{8,11}$/, 'Invalid Indonesian WhatsApp number')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  label: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const contactCreateSchema = contactSchema.extend({
  team_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
})

export const dealSchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  value: z.number().min(0).default(0),
  stage: z.enum(['chat_masuk', 'tertarik', 'ditawar', 'deal', 'batal']).default('chat_masuk'),
  assigned_to: z.string().uuid().optional().nullable(),
  reminder_at: z.string().optional().nullable(),
})

export const taskSchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
  due_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = loginSchema.extend({
  full_name: z.string().min(1, 'Full name is required'),
})
