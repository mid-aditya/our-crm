"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/contacts')
        router.refresh()
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (signUpError) throw signUpError
        setError('Check your email for confirmation link.')
        setMode('login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rise">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-base font-bold text-primary-foreground">
            O
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-tight tracking-tight">
              Our CRM
            </p>
            <p className="microlabel text-muted-foreground">
              {mode === 'login' ? 'Sign in to workspace' : 'Create workspace'}
            </p>
          </div>
        </div>

        <Card className="overflow-hidden">
          {/* Accent bar */}
          <div className="h-0.5 w-full bg-primary" />

          <div className="p-5">
            {/* Tab switch */}
            <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
              {(
                [
                  ['login', 'Sign in'],
                  ['register', 'Register'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id)
                    setError('')
                  }}
                  className={
                    'py-1.5 text-[13px] font-semibold transition-colors ' +
                    (mode === id
                      ? 'bg-secondary text-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground')
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="microlabel text-muted-foreground">
                    Full name
                  </label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="microlabel text-muted-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="microlabel text-muted-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" isLoading={loading} className="w-full">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </div>
        </Card>

        <p className="microlabel mt-6 text-center text-muted-foreground">
          Omnichannel customer management
        </p>
      </div>
    </div>
  )
}
