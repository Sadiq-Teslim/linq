import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type UserResponse, type Organization } from '@/shared/api';
import { parseApiError } from '@/shared/lib/errors';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isActivated: boolean; // Extension has been activated with access code
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;

  // Login with email/password (like web app)
  login: (email: string, password: string) => Promise<boolean>;
  
  // First-time activation with access code
  activateWithCode: (accessCode: string) => Promise<boolean>;
  validateAccessCode: (accessCode: string) => Promise<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
    message?: string;
  }>;

  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      organization: null,
      isAuthenticated: false,
      isActivated: false,
      isLoading: false,
      isValidating: false,
      error: null,

      // Login with email/password
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const tokenResponse = await authApi.login(email, password);
          set({ token: tokenResponse.access_token });

          // Fetch user details
          const user = await authApi.getMe();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            isLoading: false,
            error: apiError.message,
            isAuthenticated: false,
            token: null,
          });
          return false;
        }
      },

      // First-time activation with access code
      activateWithCode: async (accessCode: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.activateWithCode(accessCode);
          
          if (!response.success) {
            set({
              isLoading: false,
              error: response.message || 'Activation failed',
            });
            return false;
          }

          set({
            token: response.access_token || null,
            organization: response.organization || null,
            isActivated: true,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Fetch user details after activation
          if (response.access_token) {
            try {
              const user = await authApi.getMe();
              set({ user });
            } catch {
              // If getMe fails, we still activated successfully
            }
          }
          
          return true;
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            isLoading: false,
            error: apiError.message,
            isAuthenticated: false,
            token: null,
          });
          return false;
        }
      },

      // Validate access code before activating
      validateAccessCode: async (accessCode: string) => {
        set({ isValidating: true });

        try {
          const result = await authApi.validateCode(accessCode);
          set({ isValidating: false });
          return result;
        } catch {
          set({ isValidating: false });
          return { valid: false, message: 'Failed to validate code' };
        }
      },

      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            await authApi.logout();
          } catch {
            // Ignore logout errors
          }
        }
        set({
          token: null,
          user: null,
          organization: null,
          isAuthenticated: false,
          // Keep isActivated - they don't need to re-enter access code
        });
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
          set({ token: null, user: null, organization: null, isAuthenticated: false });
          return false;
        } catch {
          set({ token: null, user: null, organization: null, isAuthenticated: false });
          return false;
        }
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const user = await authApi.getMe();
          set({ user });
        } catch {
          // Ignore refresh errors
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'linq-extension-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
        isActivated: state.isActivated,
      }),
    }
  )
);
