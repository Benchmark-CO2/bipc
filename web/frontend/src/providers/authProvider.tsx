import { AuthContext } from "@/context/authContext";
import { TUser } from "@/types/user";
import { useEffect, useState } from "react";

export const storageUserKey = "tanstack.auth.user";
export const storageTokenKey = "tanstack.auth.token";

function getStoredToken() {
  const storedUser = localStorage.getItem(storageTokenKey);
  if (!storedUser) {
    return null;
  }
  try {
    const parsedUser = JSON.parse(storedUser);
    if (
      parsedUser &&
      typeof parsedUser === "object" &&
      "token" in parsedUser &&
      "expiry" in parsedUser
    ) {
      return parsedUser;
    }
  } catch (error) {
    localStorage.removeItem(storageTokenKey);
    return null;
  }
}

function setStoredToken(
  authentication_token: {
    token: string;
    expiry: string;
  } | null
) {
  if (authentication_token) {
    localStorage.setItem(storageTokenKey, JSON.stringify(authentication_token));
  } else {
    localStorage.removeItem(storageTokenKey);
  }
}
function getStoredUser() {
  const storedUser = localStorage.getItem(storageUserKey);
  if (!storedUser) {
    return null;
  }
  try {
    const parsedUser = JSON.parse(storedUser);
    if (
      parsedUser &&
      typeof parsedUser === "object"
    ) {
      return parsedUser;
    }
  } catch (error) {
    localStorage.removeItem(storageUserKey); // Clear invalid data
    return null;
  }
}

function setStoredUser(
  user: TUser | null
) {
  if (user) {
    localStorage.setItem(storageUserKey, JSON.stringify(user));
  } else {
    localStorage.removeItem(storageUserKey);
  }
}

function getStoredSidebarStatus() {
  const isMobile = window.innerWidth < 768
  const storedSidebarStatus = localStorage.getItem("sidebarStatus");
  if (storedSidebarStatus === null) {
    if (isMobile) {
      localStorage.setItem("sidebarStatus", "closed");
      return 'closed';
    }
    localStorage.setItem("sidebarStatus", "open");
    return 'open';
  }
  if (isMobile) {
    return 'closed';
  }
  return storedSidebarStatus === 'open' ? 'open' : 'closed';
}

function clearStoredData() {
  localStorage.removeItem(storageTokenKey);
  localStorage.removeItem(storageUserKey);
  localStorage.removeItem("sidebarStatus");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<{ token: string; expiry: string } | null>(
    getStoredToken()
  );
  const [user, setUser] = useState<TUser | null>(getStoredUser());
  const isAuthenticated = !!token?.token;
  const [sidebarOpen, setSidebarOpen] = useState<'open' | 'closed'>(getStoredSidebarStatus());

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    clearStoredData()
  };

  const login = (
    authentication_token: {
      token: string;
      expiry: string;
    },
    user: TUser
  ) => {
    setStoredToken(authentication_token);
    setStoredUser(user);
    setToken(authentication_token);
    setUser(user);
    localStorage.setItem('sidebarStatus', 'closed')
  };

  useEffect(() => {
    setToken(getStoredToken());
    setUser(getStoredUser());
    setSidebarOpen(getStoredSidebarStatus());
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, token, login, logout, email: user?.email ?? null, activated: user?.activated ?? null, user, sidebarStatus: sidebarOpen, toggleSidebar: () => setSidebarOpen(oldState => oldState === 'open' ? 'closed' : 'open') }}
    >
      {children}
    </AuthContext.Provider>
  );
}
