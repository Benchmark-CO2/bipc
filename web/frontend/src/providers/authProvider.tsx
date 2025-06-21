import { AuthContext } from "@/context/authContext";
import { TUser } from '@/types/user';
import { useEffect, useState } from "react";

export const storageTokenKey = 'tanstack.auth.user'

function getStoredUser() {
  const storedUser = localStorage.getItem(storageTokenKey)
  if (!storedUser) {
    return null
  }
  try {
    const parsedUser = JSON.parse(storedUser)
    if (parsedUser && typeof parsedUser === 'object' && 'token' in parsedUser && 'expiry' in parsedUser) {
      return parsedUser
    }
  } catch (error) {
    localStorage.removeItem(storageTokenKey) // Clear invalid data
    return null
  }
}

function setStoredUser(authentication_token: {
  token: string,
  expiry: string
} | null) {
  if (authentication_token) {
    localStorage.setItem(storageTokenKey, JSON.stringify(authentication_token))
  } else {
    localStorage.removeItem(storageTokenKey)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<{ token: string, expiry: string } | null>(getStoredUser())
  const [email, setEmail] = useState<string | null>(null)
  const isAuthenticated = !!token?.token

  const logout = () => {
    setStoredUser(null)
    setToken(null)
  }

  const login = (authentication_token: {
    token: string,
    expiry: string
  }, user: TUser) => {
    setStoredUser(authentication_token)
    setToken(authentication_token)
    setEmail(user.email)
  }

  useEffect(() => {
    setToken(getStoredUser())
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout, email }}>
      {children}
    </AuthContext.Provider>
  )
}

