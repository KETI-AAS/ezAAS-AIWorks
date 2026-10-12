"use client"

import { createContext, useContext, useMemo, useState } from "react"

type AuthUser = {
  /** The AI Capability author's account email. */
  email: string
}

type AuthContextValue = {
  user: AuthUser | null
  /** Mock sign-in: accepts any non-empty email/password pair. */
  login: (email: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (email, password) => {
        if (!email.trim() || !password.trim()) return false
        setUser({ email: email.trim() })
        return true
      },
      logout: () => setUser(null),
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
