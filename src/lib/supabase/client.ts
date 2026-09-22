import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { createLocalSupabaseClient } from './local'

/**
 * Client data utama. Saat env Supabase belum diisi (mode lokal/dev),
 * pakai mock in-memory supaya UI tetap bisa di-preview tanpa backend.
 */
export function createClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return createLocalSupabaseClient() as unknown as ReturnType<
      typeof createBrowserClient<Database>
    >
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
