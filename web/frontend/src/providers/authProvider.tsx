import { AuthContext } from "@/context/authContext";
import { useEffect, useState } from "react";

export const storageTokenKey = 'tanstack.auth.user'

function getStoredUser() {
  return localStorage.getItem(storageTokenKey)
}

function setStoredUser(user: string | null) {
  if (user) {
    localStorage.setItem(storageTokenKey, user)
  } else {
    localStorage.removeItem(storageTokenKey)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(getStoredUser())
  const [email, setEmail] = useState<string | null>(null)
  const isAuthenticated = !!user

  const logout = () => {
    setStoredUser(null)
    setUser(null)
  }

  const login = (token: string, email: string) => {
    setStoredUser(token)
    setUser(token)
    setEmail(email)
  }

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, email }}>
      {children}
    </AuthContext.Provider>
  )
}

