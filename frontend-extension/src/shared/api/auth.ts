/**
 * Authentication API
 * Updated to match backend endpoint structure
 */
import { api } from "./client";
import type { Organization, SubscriptionInfo } from "./types";

export interface LoginRequest {
  username: string; // OAuth2PasswordRequestForm uses 'username' for email
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  organization_name?: string;
  industry?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  previous_session_revoked?: boolean;
}

export interface UserResponse {
  id: string | number;
  email: string;
  full_name?: string;
  role?: "owner" | "admin" | "member";
  organization_id?: string | number | null;
  organization_name?: string | null;
  industry?: string | null;
  subscription?: SubscriptionInfo | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface SessionStatus {
  status: "active" | "revoked";
  user_id: string;
  email: string;
}

// Access Code Activation - for extension activation after web signup
export interface ActivationCodeRequest {
  access_code: string;
}

export interface ActivationResponse {
  success: boolean;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserResponse;
  organization?: Organization;
  message?: string;
}

export const authApi = {
  // Traditional email/password login
  // Backend: POST /auth/login
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await api.post<TokenResponse>("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  // Register via web (returns user, payment happens on web)
  // Backend: POST /auth/register
  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const response = await api.post<UserResponse>("/auth/register", data);
    return response.data;
  },

  // Activate extension with access code from web signup
  // Backend: POST /subscription/access-codes/activate
  activateWithCode: async (accessCode: string): Promise<ActivationResponse> => {
    const response = await api.post<ActivationResponse>(
      "/subscription/access-codes/activate",
      {
        code: accessCode,
      },
    );
    return response.data;
  },

  // Validate access code without activating
  // Backend: POST /subscription/access-codes/validate
  validateCode: async (
    accessCode: string,
  ): Promise<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
    expires_at?: string;
    message?: string;
  }> => {
    const response = await api.post("/subscription/access-codes/validate", {
      code: accessCode,
    });
    return response.data;
  },

  // Backend: POST /auth/logout
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  // Backend: GET /auth/me
  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>("/auth/me");
    return response.data;
  },

  // Backend: GET /auth/session/status
  checkSession: async (): Promise<SessionStatus> => {
    const response = await api.get<SessionStatus>("/auth/session/status");
    return response.data;
  },
};
