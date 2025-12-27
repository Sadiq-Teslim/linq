import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type UserResponse, type Organization } from '@/shared/api';
import { parseApiError } from '@/shared/lib/errors';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;

  // Primary activation method for extension
  activateWithCode: (accessCode: string) => Promise<boolean>;
  validateAccessCode: (accessCode: string) => Promise<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
  }>;

  // Backup login method
  login: (email: string, password: string) => Promise<boolean>;

  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  clearError: () => void;
}

// Demo user for development
const DEMO_USER: UserResponse = {
  id: 'demo-user-1',
  email: 'demo@linq.ai',
  full_name: 'Demo User',
  role: 'owner',
  organization_id: 'demo-org-1',
  organization_name: 'Acme Corp',
  industry: 'Technology',
  subscription: {
    plan: 'professional',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: false,
    max_tracked_companies: 100,
    max_team_members: 10,
    features: ['Full contact details', 'Real-time updates', 'API access'],
  },
  is_active: true,
  created_at: new Date().toISOString(),
};

const DEMO_ORG: Organization = {
  id: 'demo-org-1',
  name: 'Acme Corp',
  industry: 'Technology',
  website: 'https://acme.com',
  subscription: DEMO_USER.subscription,
  created_at: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      isValidating: false,
      error: null,

      // Primary method: Activate extension with access code from web signup
      activateWithCode: async (accessCode: string) => {
        set({ isLoading: true, error: null });

        // Demo mode: Accept "DEMO" or "LINQ-DEMO-2024" as valid codes
        if (accessCode.toUpperCase() === 'DEMO' || accessCode === 'LINQ-DEMO-2024') {
          set({
            token: 'demo-token-' + Date.now(),
            user: DEMO_USER,
            organization: DEMO_ORG,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }

        try {
          const response = await authApi.activateWithCode(accessCode);
          set({
            token: response.access_token,
            user: response.user,
            organization: response.organization,
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

      // Validate access code before activating
      validateAccessCode: async (accessCode: string) => {
        set({ isValidating: true });

        // Demo mode
        if (accessCode.toUpperCase() === 'DEMO' || accessCode === 'LINQ-DEMO-2024') {
          set({ isValidating: false });
          return {
            valid: true,
            organization_name: 'Acme Corp (Demo)',
            plan: 'Professional',
          };
        }

        try {
          const result = await authApi.validateCode(accessCode);
          set({ isValidating: false });
          return result;
        } catch {
          set({ isValidating: false });
          return { valid: false };
        }
      },

      // Backup: Traditional email/password login
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokenResponse = await authApi.login(email, password);
          set({ token: tokenResponse.access_token, isAuthenticated: true });

          const user = await authApi.getMe();
          set({ user, isLoading: false });
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

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        } finally {
          set({
            token: null,
            user: null,
            organization: null,
            isAuthenticated: false,
          });
        }
      },

      checkSession: async () => {
        const { token } = get();
        if (!token) return false;

        // Demo mode check
        if (token.startsWith('demo-token-')) {
          set({ user: DEMO_USER, organization: DEMO_ORG, isAuthenticated: true });
          return true;
        }

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

      clearError: () => set({ error: null }),
    }),
    {
      name: 'linq-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
