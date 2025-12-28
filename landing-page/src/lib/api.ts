import axios from "axios";
import { CONFIG } from "./config";

export const getApiClient = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: CONFIG.API_BASE_URL,
    headers,
  });
};

export const api = {
  // AUTH ENDPOINTS
  auth: {
    // POST /auth/register - Create new user
    register: (data: {
      company_name: string;
      full_name: string;
      email: string;
      password: string;
      industry: string;
    }) => getApiClient().post("/auth/register", data),

    // POST /auth/login - Authenticate user
    login: (email: string, password: string) => {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      return getApiClient().post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    },

    // GET /auth/google - Get Google OAuth URL
    googleAuth: () => getApiClient().get("/auth/google"),

    // GET /auth/google/callback - Handle Google OAuth callback
    googleCallback: (code: string) =>
      getApiClient().get(`/auth/google/callback?code=${code}`),

    // POST /auth/logout - Logout user
    logout: (token: string) => getApiClient(token).post("/auth/logout"),

    // GET /auth/me - Get current user
    getCurrentUser: (token: string) => getApiClient(token).get("/auth/me"),

    // GET /auth/session/status - Check session validity
    checkSession: (token: string) =>
      getApiClient(token).get("/auth/session/status"),
  },

  // SUBSCRIPTION ENDPOINTS
  subscription: {
    // GET /subscription/plans - Get all plans
    getPlans: () => getApiClient().get("/subscription/plans"),

    // GET /subscription/plans/{plan_id} - Get specific plan details
    getPlanDetails: (planId: string) =>
      getApiClient().get(`/subscription/plans/${planId}`),

    // GET /subscription/current - Get user's current subscription
    getCurrent: (token: string) =>
      getApiClient(token).get("/subscription/current"),

    // POST /subscription/subscribe - Create new subscription
    subscribe: (token: string, plan: string) =>
      getApiClient(token).post("/subscription/subscribe", { plan }),

    // POST /subscription/upgrade - Upgrade subscription
    upgrade: (token: string, plan: string) =>
      getApiClient(token).post("/subscription/upgrade", { plan }),

    // POST /subscription/access-codes - Generate access code
    generateAccessCode: (token: string, expiresInDays?: number) =>
      getApiClient(token).post("/subscription/access-codes", {
        expires_in_days: expiresInDays || 30,
      }),

    // GET /subscription/access-codes - List access codes
    listAccessCodes: (token: string) =>
      getApiClient(token).get("/subscription/access-codes"),

    // POST /subscription/paystack/initialize - Start payment
    initializePaystackPayment: (
      token: string,
      plan: string,
      callbackUrl: string
    ) => {
      const url = `/subscription/paystack/initialize?plan=${plan}&callback_url=${encodeURIComponent(
        callbackUrl
      )}`;
      console.log("Calling Paystack init with:", { plan, callbackUrl, url });
      return getApiClient(token).post(url);
    },

    // GET /subscription/paystack/verify/{reference} - Verify payment
    verifyPaystackPayment: (token: string, reference: string) =>
      getApiClient(token).get(`/subscription/paystack/verify/${reference}`),

    // GET /subscription/payment-history - Get payment history
    getPaymentHistory: (token: string) =>
      getApiClient(token).get("/subscription/payment-history"),
  },

  // ANALYTICS ENDPOINTS
  analytics: {
    // GET /analytics/usage - Get usage statistics
    getUsage: (token: string) => getApiClient(token).get("/analytics/usage"),

    // GET /analytics/subscription-status - Get subscription status
    getSubscriptionStatus: (token: string) =>
      getApiClient(token).get("/analytics/subscription-status"),

    // GET /analytics/breakdown - Get full analytics breakdown
    getFullBreakdown: (token: string, timeRange: string = "30d") =>
      getApiClient(token).get(`/analytics/breakdown?time_range=${timeRange}`),

    // GET /analytics/activity - Get recent activity log
    getActivityLog: (token: string, limit: number = 50) =>
      getApiClient(token).get(`/analytics/activity?limit=${limit}`),
  },

  // ORGANIZATION ENDPOINTS
  organization: {
    // GET /organization/team-members - Get team members
    getTeamMembers: (token: string) =>
      getApiClient(token).get("/organization/team-members"),

    // POST /organization/team-members/invite - Invite team member
    inviteTeamMember: (token: string, email: string) =>
      getApiClient(token).post("/organization/team-members/invite", { email }),

    // DELETE /organization/team-members/{user_id} - Remove team member
    removeTeamMember: (token: string, userId: number) =>
      getApiClient(token).delete(`/organization/team-members/${userId}`),
  },
};
