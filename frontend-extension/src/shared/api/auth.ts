import { api } from './client';

export interface LoginRequest {
  username: string; // OAuth2PasswordRequestForm uses 'username' for email
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  company_name?: string;
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
  company_name?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
}

export interface SessionStatus {
  status: 'active' | 'revoked';
  user_id: string;
  email: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    // OAuth2PasswordRequestForm requires form-urlencoded data
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

  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const response = await api.post<UserResponse>('/auth/register', data);
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
};
