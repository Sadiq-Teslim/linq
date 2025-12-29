import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type UserResponse, type Organization } from "@/shared/api";
import { parseApiError } from "@/shared/lib/errors";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  organization: Organization | null;
  accessCode: string | null; // Stored permanently after first activation
  accessCodeExpiresAt: string | null; // When the access code expires
  isAuthenticated: boolean;
  isActivated: boolean; // Extension has been activated with access code
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  needsNewAccessCode: boolean; // True if access code expired or plan ended

  // Step 1: Login with email/password first
  login: (email: string, password: string) => Promise<{
    success: boolean;
    needsAccessCode: boolean;
    message?: string;
  }>;

  // Step 2: Activate with access code (only needed first time or after expiry)
  activateWithAccessCode: (accessCode: string) => Promise<boolean>;

  // Validate access code before activating
  validateAccessCode: (accessCode: string) => Promise<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
    expires_at?: string;
    message?: string;
  }>;

  // Check if stored access code is still valid
  checkAccessCodeValidity: () => Promise<boolean>;

  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  setNeedsNewAccessCode: (needs: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      organization: null,
      accessCode: null,
      accessCodeExpiresAt: null,
      isAuthenticated: false,
      isActivated: false,
      isLoading: false,
      isValidating: false,
      error: null,
      needsNewAccessCode: false,

      // Step 1: Login with email/password
      // Returns whether login succeeded and if access code is needed
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const tokenResponse = await authApi.login(email, password);
          set({ token: tokenResponse.access_token });

          // Fetch user details
          const user = await authApi.getMe();

          // Check if user has an active subscription
          const subscription = user.subscription;
          if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
            set({
              isLoading: false,
              error: "Your subscription is not active. Please subscribe first.",
              token: null,
            });
            return { success: false, needsAccessCode: false, message: "Subscription not active" };
          }

          // Check if we have a stored access code and if it's still valid
          const { accessCode, accessCodeExpiresAt, isActivated } = get();

          // If already activated with a valid access code, complete login
          if (isActivated && accessCode) {
            // Check if access code has expired
            if (accessCodeExpiresAt) {
              const expiresAt = new Date(accessCodeExpiresAt);
              if (expiresAt < new Date()) {
                // Access code expired, need a new one
                set({
                  user,
                  isLoading: false,
                  needsNewAccessCode: true,
                });
                return { success: true, needsAccessCode: true, message: "Access code expired" };
              }
            }

            // Access code still valid, complete authentication
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              needsNewAccessCode: false,
            });
            return { success: true, needsAccessCode: false };
          }

          // Not activated yet, need access code
          set({
            user,
            isLoading: false,
          });
          return { success: true, needsAccessCode: true, message: "Please enter your access code" };

        } catch (error) {
          const apiError = parseApiError(error);
          set({
            isLoading: false,
            error: apiError.message,
            isAuthenticated: false,
            token: null,
          });
          return { success: false, needsAccessCode: false, message: apiError.message };
        }
      },

      // Step 2: Activate with access code (stores it permanently)
      activateWithAccessCode: async (accessCode: string) => {
        set({ isLoading: true, error: null });

        try {
          // Validate the access code first
          const validation = await authApi.validateCode(accessCode);

          if (!validation.valid) {
            set({
              isLoading: false,
              error: validation.message || "Invalid access code",
            });
            return false;
          }

          // Activate the access code
          const activationResponse = await authApi.activateWithCode(accessCode);

          if (!activationResponse.success) {
            set({
              isLoading: false,
              error: activationResponse.message || "Failed to activate access code",
            });
            return false;
          }

          // Store access code permanently
          set({
            accessCode: accessCode,
            accessCodeExpiresAt: validation.expires_at || null,
            organization: activationResponse.organization || null,
            isAuthenticated: true,
            isActivated: true,
            isLoading: false,
            needsNewAccessCode: false,
            error: null,
          });

          return true;
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            isLoading: false,
            error: apiError.message,
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

      // Check if stored access code is still valid
      checkAccessCodeValidity: async () => {
        const { accessCode, accessCodeExpiresAt } = get();

        if (!accessCode) {
          set({ needsNewAccessCode: true });
          return false;
        }

        // Check expiry date
        if (accessCodeExpiresAt) {
          const expiresAt = new Date(accessCodeExpiresAt);
          if (expiresAt < new Date()) {
            set({ needsNewAccessCode: true });
            return false;
          }
        }

        // Optionally validate with server
        try {
          const result = await authApi.validateCode(accessCode);
          if (!result.valid) {
            set({ needsNewAccessCode: true });
            return false;
          }
          return true;
        } catch {
          // If server validation fails, assume valid (offline mode)
          return true;
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
        // Clear everything including access code on logout
        set({
          token: null,
          user: null,
          organization: null,
          accessCode: null,
          accessCodeExpiresAt: null,
          isAuthenticated: false,
          isActivated: false,
          needsNewAccessCode: false,
        });
      },

      checkSession: async () => {
        const { token, isActivated, accessCode } = get();
        if (!token) return false;

        try {
          const status = await authApi.checkSession();
          if (status.status === "active") {
            const user = await authApi.getMe();

            // Check subscription status
            const subscription = user.subscription;
            if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
              set({
                needsNewAccessCode: true,
                isAuthenticated: false,
              });
              return false;
            }

            // If activated with access code, fully authenticate
            if (isActivated && accessCode) {
              set({ user, isAuthenticated: true });
              return true;
            }

            // Has valid session but needs access code
            set({ user, isAuthenticated: false, needsNewAccessCode: true });
            return false;
          }

          set({
            token: null,
            user: null,
            isAuthenticated: false,
          });
          return false;
        } catch {
          set({
            token: null,
            user: null,
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

          // Check if subscription is still active
          const subscription = user.subscription;
          if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
            set({ needsNewAccessCode: true });
          }

          set({ user });
        } catch {
          // Ignore refresh errors
        }
      },

      clearError: () => set({ error: null }),

      setNeedsNewAccessCode: (needs: boolean) => set({ needsNewAccessCode: needs }),
    }),
    {
      name: "linq-extension-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        organization: state.organization,
        accessCode: state.accessCode,
        accessCodeExpiresAt: state.accessCodeExpiresAt,
        isAuthenticated: state.isAuthenticated,
        isActivated: state.isActivated,
      }),
    },
  ),
);
