import { TUser } from '@/types/user';
import { createContext } from "react";

export interface AuthContext {
  isAuthenticated: boolean
  login: (
  authentication_token: {
		token: string,
		expiry: string
  }, user: TUser) => void
  logout: () => void
  token: {
    token: string,
    expiry: string
  } | null
  email: string | null
}

export const AuthContext = createContext<AuthContext | null>(null)
