/**
 * Subscription & Billing API - Paystack Integration
 */
import { api } from './client';
import type {
  SubscriptionInfo,
  PlanDetails,
  Organization,
  TeamMember,
} from './types';

export const subscriptionApi = {
  // Get available plans
  getPlans: async (): Promise<PlanDetails[]> => {
    const response = await api.get<PlanDetails[]>('/subscription/plans');
    return response.data;
  },

  // Get current subscription
  getCurrent: async (): Promise<SubscriptionInfo> => {
    const response = await api.get<SubscriptionInfo>('/subscription/current');
    return response.data;
  },

  // Initialize Paystack payment
  initializePayment: async (planId: string, billingCycle: 'monthly' | 'yearly'): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> => {
    const response = await api.post('/subscription/initialize', {
      plan_id: planId,
      billing_cycle: billingCycle,
    });
    return response.data;
  },

  // Verify payment after Paystack redirect
  verifyPayment: async (reference: string): Promise<SubscriptionInfo> => {
    const response = await api.post<SubscriptionInfo>('/subscription/verify', {
      reference,
    });
    return response.data;
  },

  // Cancel subscription
  cancel: async (): Promise<SubscriptionInfo> => {
    const response = await api.post<SubscriptionInfo>('/subscription/cancel');
    return response.data;
  },

  // Resume cancelled subscription
  resume: async (): Promise<SubscriptionInfo> => {
    const response = await api.post<SubscriptionInfo>('/subscription/resume');
    return response.data;
  },

  // Update payment method
  updatePaymentMethod: async (): Promise<{ authorization_url: string }> => {
    const response = await api.post('/subscription/update-payment-method');
    return response.data;
  },
};

export const organizationApi = {
  // Get organization details
  get: async (): Promise<Organization> => {
    const response = await api.get<Organization>('/organization');
    return response.data;
  },

  // Update organization
  update: async (data: {
    name?: string;
    industry?: string;
    website?: string;
  }): Promise<Organization> => {
    const response = await api.patch<Organization>('/organization', data);
    return response.data;
  },

  // Get team members
  getTeamMembers: async (): Promise<TeamMember[]> => {
    const response = await api.get<TeamMember[]>('/organization/team');
    return response.data;
  },

  // Invite team member
  inviteMember: async (email: string, role: 'admin' | 'member'): Promise<TeamMember> => {
    const response = await api.post<TeamMember>('/organization/team/invite', {
      email,
      role,
    });
    return response.data;
  },

  // Remove team member
  removeMember: async (memberId: string): Promise<void> => {
    await api.delete(`/organization/team/${memberId}`);
  },

  // Update team member role
  updateMemberRole: async (memberId: string, role: 'admin' | 'member'): Promise<TeamMember> => {
    const response = await api.patch<TeamMember>(`/organization/team/${memberId}`, { role });
    return response.data;
  },
};

// Demo/Mock data for development
export const DEMO_PLANS: PlanDetails[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price_monthly: 0,
    price_yearly: 0,
    max_tracked_companies: 5,
    max_team_members: 1,
    features: [
      'Track up to 5 companies',
      'Basic contact information',
      'Weekly updates',
      'Industry news feed',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price_monthly: 29,
    price_yearly: 290,
    max_tracked_companies: 25,
    max_team_members: 3,
    features: [
      'Track up to 25 companies',
      'Full contact details',
      'Daily updates',
      'Email notifications',
      'Industry news feed',
      'Export to CSV',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price_monthly: 79,
    price_yearly: 790,
    max_tracked_companies: 100,
    max_team_members: 10,
    features: [
      'Track up to 100 companies',
      'Full contact details + phone',
      'Real-time updates',
      'Priority support',
      'API access',
      'CRM integrations',
      'Custom reports',
    ],
    is_popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price_monthly: 199,
    price_yearly: 1990,
    max_tracked_companies: -1, // Unlimited
    max_team_members: -1,
    features: [
      'Unlimited companies',
      'Unlimited team members',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
      'White-label option',
    ],
  },
];
