import { TUser } from "@/types/user";
import { createContext } from "react";

export interface AuthContext {
  isAuthenticated: boolean;
  activated: boolean | null;
  login: (
    authentication_token: {
      token: string;
      expiry: string;
    },
    user: TUser,
  ) => void;
  logout: () => void;
  refreshUser: (user: TUser) => void;
  token: {
    token: string;
    expiry: string;
  } | null;
  email: string | null;
  user: TUser | null;
  sidebarStatus: "open" | "closed";
  toggleSidebar: () => void;
}

export const AuthContext = createContext<AuthContext | null>(null);
