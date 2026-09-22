import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mockProfile } from '@/lib/supabase/local'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

const isLocalMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** User dummy untuk mode lokal — bentuknya menyerupai supabase User. */
const mockUser = {
  id: mockProfile.id,
  email: 'andi@ourcrm.dev',
  user_metadata: { full_name: mockProfile.full_name },
} as unknown as User

export function useAuth() {
  const [user, setUser] = useState<User | null>(isLocalMode ? mockUser : null)
  const [profile, setProfile] = useState<Profile | null>(
    isLocalMode ? (mockProfile as Profile) : null,
  )
  const [loading, setLoading] = useState(!isLocalMode)

  useEffect(() => {
    if (isLocalMode) return

    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchProfile(user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  async function signIn(email: string, password: string) {
    if (isLocalMode) {
      return { data: { user: mockUser, session: null }, error: null }
    }
    const supabase = createClient()
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email: string, password: string, fullName: string) {
    if (isLocalMode) {
      return { data: { user: mockUser, session: null }, error: null }
    }
    const supabase = createClient()
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return result
  }

  async function signOut() {
    if (isLocalMode) {
      setUser(mockUser)
      setProfile(mockProfile as Profile)
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return { user, profile, loading, signIn, signUp, signOut }
}
