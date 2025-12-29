/**
 * Companies API - Track and monitor companies
 * Updated to match backend endpoint structure
 */
import { api } from "./client";
import type {
  TrackedCompany,
  TrackedCompanyDetails,
  CompanySearchResult,
  CompanySearchResponse,
  CompanyUpdate,
  PaginatedResponse,
} from "./types";
import { transformContacts } from "./transformers";

export const companiesApi = {
  // Search for companies globally
  // Backend: GET /companies/search?query=...
  search: async (query: string): Promise<CompanySearchResponse> => {
    const response = await api.get<CompanySearchResponse>("/companies/search", {
      params: { query }, // Backend uses 'query' not 'q'
    });
    return response.data;
  },

  // Get all tracked companies for the organization
  // Backend: GET /companies (root path)
  getTracked: async (
    page = 1,
    limit = 20,
    filter?: { priority?: boolean; tag?: string },
  ): Promise<PaginatedResponse<TrackedCompany>> => {
    const response = await api.get<PaginatedResponse<TrackedCompany>>(
      "/companies",
      {
        params: {
          page,
          page_size: limit,
          is_priority: filter?.priority,
        },
      },
    );
    return response.data;
  },

  // Add a company to tracking
  // Backend: POST /companies (root path)
  track: async (company: CompanySearchResult): Promise<TrackedCompany> => {
    const response = await api.post<TrackedCompany>("/companies", {
      company_name: company.name,
      domain: company.domain,
      industry: company.industry,
      headquarters: company.headquarters,
      website: company.website,
      linkedin_url: company.linkedin_url,
      logo_url: company.logo_url,
      employee_count: company.employee_count,
      description: company.description,
      update_frequency: "weekly",
      is_priority: false,
    });
    return response.data;
  },

  // Remove a company from tracking
  // Backend: DELETE /companies/{company_id}
  untrack: async (companyId: string): Promise<void> => {
    await api.delete(`/companies/${companyId}`);
  },

  // Get detailed info about a tracked company
  // Backend: GET /companies/{company_id}
  getDetails: async (companyId: string): Promise<TrackedCompanyDetails> => {
    const response = await api.get<TrackedCompanyDetails>(
      `/companies/${companyId}`,
    );
    // Transform contacts to ensure full_name is mapped to name
    if (response.data.contacts) {
      response.data.contacts = transformContacts(response.data.contacts);
    }
    return response.data;
  },

  // Update tracking settings for a company
  // Backend: PATCH /companies/{company_id}
  updateTracking: async (
    companyId: string,
    settings: {
      is_priority?: boolean;
      update_frequency?: "daily" | "weekly" | "monthly";
      tags?: string[];
      notes?: string;
    },
  ): Promise<TrackedCompany> => {
    const response = await api.patch<TrackedCompany>(
      `/companies/${companyId}`,
      settings,
    );
    return response.data;
  },

  // Get updates for all tracked companies
  // Backend: GET /companies/updates
  getUpdates: async (
    page = 1,
    limit = 20,
    filter?: {
      company_id?: string;
      importance?: "low" | "medium" | "high" | "critical";
      unread_only?: boolean;
    },
  ): Promise<PaginatedResponse<CompanyUpdate>> => {
    const response = await api.get<PaginatedResponse<CompanyUpdate>>(
      "/companies/updates",
      {
        params: {
          page,
          page_size: limit,
          company_id: filter?.company_id,
          is_read: filter?.unread_only ? false : undefined,
        },
      },
    );
    return response.data;
  },

  // Mark updates as read
  // Backend: POST /companies/updates/mark-read
  markUpdatesRead: async (updateIds: string[]): Promise<void> => {
    await api.post("/companies/updates/mark-read", { update_ids: updateIds });
  },

  // Trigger manual refresh for a company
  // Backend: POST /companies/{company_id}/refresh
  refresh: async (companyId: string): Promise<TrackedCompany> => {
    const response = await api.post<TrackedCompany>(
      `/companies/${companyId}/refresh`,
    );
    return response.data;
  },

  // Update company settings (alias for updateTracking)
  updateSettings: async (
    companyId: string,
    settings: {
      is_priority?: boolean;
      update_frequency?: "daily" | "weekly" | "monthly";
      tags?: string[];
      notes?: string;
    },
  ): Promise<TrackedCompany> => {
    const response = await api.patch<TrackedCompany>(
      `/companies/${companyId}`,
      settings,
    );
    return response.data;
  },
};
