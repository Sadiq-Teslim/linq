import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  full_name: string;
  organization_id?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tokenExpiry: number | null; // Unix timestamp when token expires
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string, expiresIn?: number) => void;
  logout: () => void;
  restoreSession: (user: User, token: string) => void;
  isTokenExpired: () => boolean;
  getTimeUntilExpiry: () => number | null;
}

// Default token expiry: 24 hours (in seconds)
const DEFAULT_TOKEN_EXPIRY_SECONDS = 24 * 60 * 60;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiry: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => set({ token }),

      login: (user, token, expiresIn = DEFAULT_TOKEN_EXPIRY_SECONDS) => {
        const expiry = Date.now() + expiresIn * 1000;
        
        // Also save to localStorage for backup
        localStorage.setItem("linq_token", token);
        localStorage.setItem("linq_user", JSON.stringify(user));
        localStorage.setItem("linq_token_expiry", expiry.toString());
        
        set({
          user,
          token,
          tokenExpiry: expiry,
          isAuthenticated: true,
        });
      },

      restoreSession: (user, token) => {
        // Try to restore expiry from localStorage
        const storedExpiry = localStorage.getItem("linq_token_expiry");
        const expiry = storedExpiry ? parseInt(storedExpiry, 10) : null;
        
        // If token is expired, don't restore
        if (expiry && Date.now() > expiry) {
          console.warn("[Auth] Stored token is expired. Not restoring session.");
          localStorage.removeItem("linq_token");
          localStorage.removeItem("linq_user");
          localStorage.removeItem("linq_token_expiry");
          return;
        }
        
        set({
          user,
          token,
          tokenExpiry: expiry,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem("linq_token");
        localStorage.removeItem("linq_user");
        localStorage.removeItem("linq_token_expiry");
        localStorage.removeItem("linq-auth-storage");
        
        set({
          user: null,
          token: null,
          tokenExpiry: null,
          isAuthenticated: false,
        });
      },

      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return false; // No expiry set, assume valid
        return Date.now() > tokenExpiry;
      },

      getTimeUntilExpiry: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return null;
        const remaining = tokenExpiry - Date.now();
        return remaining > 0 ? remaining : 0;
      },
    }),
    {
      name: "linq-auth-storage", // Key in localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tokenExpiry: state.tokenExpiry,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
