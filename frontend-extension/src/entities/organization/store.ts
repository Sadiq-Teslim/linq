/**
 * Organization & Subscription Store
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  organizationApi,
  subscriptionApi,
  DEMO_PLANS,
  type Organization,
  type TeamMember,
  type PlanDetails,
} from "@/shared/api";
import { parseApiError } from "@/shared/lib/errors";

interface OrganizationState {
  organization: Organization | null;
  teamMembers: TeamMember[];
  plans: PlanDetails[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchOrganization: () => Promise<void>;
  updateOrganization: (data: {
    name?: string;
    industry?: string;
    website?: string;
  }) => Promise<void>;
  fetchTeamMembers: () => Promise<void>;
  inviteMember: (email: string, role: "admin" | "member") => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  fetchPlans: () => Promise<void>;
  reset: () => void;
}

// Demo organization for development
const DEMO_ORGANIZATION: Organization = {
  id: "demo-org-1",
  name: "Acme Corp",
  industry: "Technology",
  website: "https://acme.com",
  subscription: {
    plan: "professional",
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    cancel_at_period_end: false,
    max_tracked_companies: 100,
    max_team_members: 10,
    features: ["Full contact details", "Real-time updates", "API access"],
  },
  created_at: new Date().toISOString(),
};

const DEMO_TEAM: TeamMember[] = [
  {
    id: "member-1",
    email: "owner@acme.com",
    name: "John Doe",
    role: "owner",
    is_active: true,
    invited_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  },
];

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      organization: null,
      teamMembers: [],
      plans: DEMO_PLANS,
      isLoading: false,
      error: null,

      fetchOrganization: async () => {
        set({ isLoading: true, error: null });
        try {
          const organization = await organizationApi.get();
          set({ organization, isLoading: false });
        } catch (error) {
          // Use demo data in development
          console.log("Using demo organization data");
          set({ organization: DEMO_ORGANIZATION, isLoading: false });
        }
      },

      updateOrganization: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const organization = await organizationApi.update(data);
          set({ organization, isLoading: false });
        } catch (error) {
          const apiError = parseApiError(error);
          set({ error: apiError.message, isLoading: false });
        }
      },

      fetchTeamMembers: async () => {
        set({ isLoading: true, error: null });
        try {
          const teamMembers = await organizationApi.getTeamMembers();
          set({ teamMembers, isLoading: false });
        } catch (error) {
          // Use demo data
          console.log("Using demo team data");
          set({ teamMembers: DEMO_TEAM, isLoading: false });
        }
      },

      inviteMember: async (email, role) => {
        set({ isLoading: true, error: null });
        try {
          const member = await organizationApi.inviteMember(email, role);
          set((state) => ({
            teamMembers: [...state.teamMembers, member],
            isLoading: false,
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          set({ error: apiError.message, isLoading: false });
          throw error;
        }
      },

      removeMember: async (memberId) => {
        set({ isLoading: true, error: null });
        try {
          await organizationApi.removeMember(memberId);
          set((state) => ({
            teamMembers: state.teamMembers.filter((m) => m.id !== memberId),
            isLoading: false,
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          set({ error: apiError.message, isLoading: false });
        }
      },

      fetchPlans: async () => {
        try {
          const plans = await subscriptionApi.getPlans();
          set({ plans });
        } catch {
          // Use demo plans
          set({ plans: DEMO_PLANS });
        }
      },

      reset: () =>
        set({
          organization: null,
          teamMembers: [],
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "linq-organization-storage",
      partialize: (state) => ({
        organization: state.organization,
      }),
    },
  ),
);
