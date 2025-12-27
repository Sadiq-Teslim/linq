import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type UserResponse } from '@/shared/api';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName?: string, companyName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokenResponse = await authApi.login(email, password);
          set({ token: tokenResponse.access_token, isAuthenticated: true });

          // Fetch user details
          const user = await authApi.getMe();
          set({ user, isLoading: false });
          return true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ isLoading: false, error: message, isAuthenticated: false, token: null });
          return false;
        }
      },

      register: async (email: string, password: string, fullName?: string, companyName?: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register({
            email,
            password,
            full_name: fullName,
            company_name: companyName,
          });
          // Auto-login after registration
          return await get().login(email, password);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        } finally {
          set({ token: null, user: null, isAuthenticated: false });
        }
      },

      checkSession: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const status = await authApi.checkSession();
          if (status.status === 'active') {
            const user = await authApi.getMe();
            set({ user, isAuthenticated: true });
            return true;
          }
          set({ token: null, user: null, isAuthenticated: false });
          return false;
        } catch {
          set({ token: null, user: null, isAuthenticated: false });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'linq-auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);