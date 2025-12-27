/**
 * User entity types
 */
export interface User {
  id: number;
  email: string;
  fullName?: string;
  companyName?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  subscriptionExpiresAt?: string;
  isActive: boolean;
}
