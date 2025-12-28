import { api } from './client';
import type { Organization, SubscriptionInfo } from './types';

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
  id: string;
  email: string;
  full_name?: string;
  role: 'owner' | 'admin' | 'member';
  organization_id: string;
  organization_name: string;
  industry: string;
  subscription: SubscriptionInfo;
  is_active: boolean;
  created_at: string;
}

export interface SessionStatus {
  status: 'active' | 'revoked';
  user_id: string;
  email: string;
}

// Access Code Activation - for extension activation after web signup
export interface ActivationCodeRequest {
  access_code: string;
}

export interface ActivationResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
  organization: Organization;
}

export const authApi = {
  // Traditional email/password login (backup method)
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post<TokenResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  // Register via web (returns user, payment happens on web)
  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const response = await api.post<UserResponse>('/auth/register', data);
    return response.data;
  },

  // Activate extension with access code from web signup
  activateWithCode: async (accessCode: string): Promise<ActivationResponse> => {
    const response = await api.post<ActivationResponse>('/subscription/access-codes/activate', {
      code: accessCode,
    });
    return response.data;
  },

  // Validate access code without activating
  validateCode: async (accessCode: string): Promise<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
    expires_at?: string;
    message?: string;
  }> => {
    const response = await api.post('/subscription/access-codes/validate', {
      code: accessCode,
    });
    return response.data;
  },

  // Generate new access code (from web dashboard)
  generateAccessCode: async (): Promise<{
    access_code: string;
    expires_at: string;
  }> => {
    const response = await api.post('/auth/generate-code');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },

  checkSession: async (): Promise<SessionStatus> => {
    const response = await api.get<SessionStatus>('/auth/session/status');
    return response.data;
  },

  // Refresh token
  refreshToken: async (): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/refresh');
    return response.data;
  },
};
