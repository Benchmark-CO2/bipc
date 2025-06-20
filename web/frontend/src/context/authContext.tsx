import { createContext } from "react";

export interface AuthContext {
  isAuthenticated: boolean
  login: (token: string, email: string) => void
  logout: () => void
  user: string | null
  email: string | null
}

export const AuthContext = createContext<AuthContext | null>(null)
