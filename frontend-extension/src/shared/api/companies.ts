/**
 * Companies API - Track and monitor companies
 */
import { api } from './client';
import type {
  TrackedCompany,
  TrackedCompanyDetails,
  CompanySearchResult,
  CompanySearchResponse,
  CompanyUpdate,
  PaginatedResponse,
} from './types';

export const companiesApi = {
  // Search for companies globally
  search: async (query: string): Promise<CompanySearchResponse> => {
    const response = await api.get<CompanySearchResponse>('/companies/search', {
      params: { q: query },
    });
    return response.data;
  },

  // Get all tracked companies for the organization
  getTracked: async (
    page = 1,
    limit = 20,
    filter?: { priority?: boolean; tag?: string }
  ): Promise<PaginatedResponse<TrackedCompany>> => {
    const response = await api.get<PaginatedResponse<TrackedCompany>>('/companies/tracked', {
      params: { page, limit, ...filter },
    });
    return response.data;
  },

  // Add a company to tracking
  track: async (company: CompanySearchResult): Promise<TrackedCompany> => {
    const response = await api.post<TrackedCompany>('/companies/track', {
      company_name: company.name,
      domain: company.domain,
      industry: company.industry,
      headquarters: company.headquarters,
      website: company.website,
      linkedin_url: company.linkedin_url,
    });
    return response.data;
  },

  // Remove a company from tracking
  untrack: async (companyId: string): Promise<void> => {
    await api.delete(`/companies/tracked/${companyId}`);
  },

  // Get detailed info about a tracked company
  getDetails: async (companyId: string): Promise<TrackedCompanyDetails> => {
    const response = await api.get<TrackedCompanyDetails>(`/companies/tracked/${companyId}`);
    return response.data;
  },

  // Update tracking settings for a company
  updateTracking: async (
    companyId: string,
    settings: {
      is_priority?: boolean;
      update_frequency?: 'daily' | 'weekly' | 'monthly';
      tags?: string[];
      notes?: string;
    }
  ): Promise<TrackedCompany> => {
    const response = await api.patch<TrackedCompany>(`/companies/tracked/${companyId}`, settings);
    return response.data;
  },

  // Get updates for all tracked companies
  getUpdates: async (
    page = 1,
    limit = 20,
    filter?: {
      company_id?: string;
      importance?: 'low' | 'medium' | 'high' | 'critical';
      unread_only?: boolean;
    }
  ): Promise<PaginatedResponse<CompanyUpdate>> => {
    const response = await api.get<PaginatedResponse<CompanyUpdate>>('/companies/updates', {
      params: { page, limit, ...filter },
    });
    return response.data;
  },

  // Mark updates as read
  markUpdatesRead: async (updateIds: string[]): Promise<void> => {
    await api.post('/companies/updates/mark-read', { update_ids: updateIds });
  },

  // Trigger manual refresh for a company
  refreshCompany: async (companyId: string): Promise<TrackedCompanyDetails> => {
    const response = await api.post<TrackedCompanyDetails>(`/companies/tracked/${companyId}/refresh`);
    return response.data;
  },
};
