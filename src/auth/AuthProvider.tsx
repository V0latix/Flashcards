import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import { AuthContext } from './context'

const getRedirectUrl = () => {
  const baseUrl = import.meta.env.BASE_URL
  return new URL(baseUrl, window.location.origin).toString()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) {
        return
      }
      if (error) {
        console.error('Auth session error', error.message)
      }
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    void syncSession()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error ? error.message : null }
  }

  const signInWithProvider = async (provider: 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl()
      }
    })
    return { error: error ? error.message : null }
  }

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl()
      }
    })
    return { error: error ? error.message : null }
  }

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signInWithProvider,
      signInWithEmail,
      signOut
    }),
    [user, session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
