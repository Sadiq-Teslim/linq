import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type UserResponse, type Organization } from "@/shared/api";
import { parseApiError } from "@/shared/lib/errors";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isActivated: boolean; // Extension has been activated with access code
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;

  // Combined login: email + password + access code (one-time)
  loginWithAccessCode: (
    email: string,
    password: string,
    accessCode: string,
  ) => Promise<boolean>;

  // Login with email/password only (after first activation)
  login: (email: string, password: string) => Promise<boolean>;

  // Validate access code
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

      // Combined login: email + password + access code
      loginWithAccessCode: async (
        email: string,
        password: string,
        accessCode: string,
      ) => {
        set({ isLoading: true, error: null });

        try {
          // Step 1: Validate and activate the access code
          const activationResponse = await authApi.activateWithCode(accessCode);

          if (!activationResponse.success) {
            set({
              isLoading: false,
              error: activationResponse.message || "Invalid access code",
            });
            return false;
          }

          // Step 2: Login with email/password
          const tokenResponse = await authApi.login(email, password);

          // Store the token
          set({ token: tokenResponse.access_token });

          // Step 3: Fetch user details
          const user = await authApi.getMe();

          // Check if user has an active subscription
          const subscription = user.subscription;
          if (!subscription || subscription.status !== "active") {
            set({
              isLoading: false,
              error: "Your subscription is not active. Please subscribe first.",
              token: null,
            });
            return false;
          }

          set({
            user,
            organization: activationResponse.organization || null,
            isAuthenticated: true,
            isActivated: true,
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

      // Login with email/password only (after first activation)
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const tokenResponse = await authApi.login(email, password);
          set({ token: tokenResponse.access_token });

          // Fetch user details
          const user = await authApi.getMe();

          // Check if user has an active subscription
          const subscription = user.subscription;
          if (!subscription || subscription.status !== "active") {
            set({
              isLoading: false,
              error: "Your subscription is not active. Please subscribe first.",
              token: null,
            });
            return false;
          }

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

      // Validate access code before activating
      validateAccessCode: async (accessCode: string) => {
        set({ isValidating: true });

        try {
          const result = await authApi.validateCode(accessCode);
          set({ isValidating: false });
          return result;
        } catch {
          set({ isValidating: false });
          return { valid: false, message: "Failed to validate code" };
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
          isActivated: false, // Reset activation on logout
        });
      },

      checkSession: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const status = await authApi.checkSession();
          if (status.status === "active") {
            const user = await authApi.getMe();
            set({ user, isAuthenticated: true });
            return true;
          }
          set({
            token: null,
            user: null,
            organization: null,
            isAuthenticated: false,
          });
          return false;
        } catch {
          set({
            token: null,
            user: null,
            organization: null,
            isAuthenticated: false,
          });
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
      name: "linq-extension-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
        isActivated: state.isActivated,
      }),
    },
  ),
);
