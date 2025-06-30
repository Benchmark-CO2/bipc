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
    localStorage.removeItem(storageTokenKey); // Clear invalid data
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<{ token: string; expiry: string } | null>(
    getStoredToken()
  );
  const isAuthenticated = !!token?.token;

  const logout = () => {
    setStoredToken(null);
    setToken(null);
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
  };

  useEffect(() => {
    setToken(getStoredToken());
  }, []);
  const storedUser = getStoredUser();

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, token, login, logout, email: storedUser?.email ?? null, activated: storedUser?.activated ?? null }}
    >
      {children}
    </AuthContext.Provider>
  );
}
