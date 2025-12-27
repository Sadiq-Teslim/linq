/**
 * Tracked Companies Store - Monitor Board
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  companiesApi,
  type TrackedCompany,
  type TrackedCompanyDetails,
  type CompanySearchResult,
  type CompanyUpdate,
} from '@/shared/api';
import { parseApiError } from '@/shared/lib/errors';

interface CompanyState {
  // Tracked companies list
  trackedCompanies: TrackedCompany[];
  selectedCompany: TrackedCompanyDetails | null;

  // Search
  searchResults: CompanySearchResult[];
  searchQuery: string;

  // Updates feed
  updates: CompanyUpdate[];
  unreadCount: number;

  // UI State
  isLoading: boolean;
  isSearching: boolean;
  isRefreshing: boolean;
  error: string | null;
  errorCode: string | null;

  // Actions
  fetchTrackedCompanies: () => Promise<void>;
  searchCompanies: (query: string) => Promise<void>;
  trackCompany: (company: CompanySearchResult) => Promise<void>;
  untrackCompany: (companyId: string) => Promise<void>;
  selectCompany: (companyId: string) => Promise<void>;
  clearSelection: () => void;
  updateCompanySettings: (companyId: string, settings: {
    is_priority?: boolean;
    update_frequency?: 'daily' | 'weekly' | 'monthly';
    tags?: string[];
    notes?: string;
  }) => Promise<void>;
  fetchUpdates: (filter?: { unread_only?: boolean }) => Promise<void>;
  markUpdatesRead: (updateIds: string[]) => Promise<void>;
  refreshCompany: (companyId: string) => Promise<void>;
  clearSearch: () => void;
  reset: () => void;
}

// Demo data for development
const DEMO_TRACKED_COMPANIES: TrackedCompany[] = [
  {
    id: 'company-1',
    company_name: 'Stripe',
    domain: 'stripe.com',
    industry: 'Fintech',
    headquarters: 'San Francisco, USA',
    logo_url: 'https://logo.clearbit.com/stripe.com',
    website: 'https://stripe.com',
    employee_count: '5000+',
    description: 'Online payment processing for internet businesses',
    linkedin_url: 'https://linkedin.com/company/stripe',
    added_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    added_by: 'user-1',
    last_updated: new Date().toISOString(),
    update_frequency: 'daily',
    is_priority: true,
    tags: ['fintech', 'payments', 'target'],
  },
  {
    id: 'company-2',
    company_name: 'Shopify',
    domain: 'shopify.com',
    industry: 'E-commerce',
    headquarters: 'Ottawa, Canada',
    logo_url: 'https://logo.clearbit.com/shopify.com',
    website: 'https://shopify.com',
    employee_count: '10000+',
    description: 'E-commerce platform for online stores',
    linkedin_url: 'https://linkedin.com/company/shopify',
    added_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    added_by: 'user-1',
    last_updated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    update_frequency: 'weekly',
    is_priority: false,
    tags: ['e-commerce', 'saas'],
  },
  {
    id: 'company-3',
    company_name: 'Notion',
    domain: 'notion.so',
    industry: 'Productivity',
    headquarters: 'San Francisco, USA',
    logo_url: 'https://logo.clearbit.com/notion.so',
    website: 'https://notion.so',
    employee_count: '500+',
    description: 'All-in-one workspace for notes and collaboration',
    linkedin_url: 'https://linkedin.com/company/notionhq',
    added_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    added_by: 'user-1',
    last_updated: new Date().toISOString(),
    update_frequency: 'daily',
    is_priority: true,
    tags: ['productivity', 'saas', 'hot-lead'],
  },
];

const DEMO_UPDATES: CompanyUpdate[] = [
  {
    id: 'update-1',
    company_id: 'company-1',
    update_type: 'funding',
    headline: 'Stripe raises $600M at $50B valuation',
    summary: 'Stripe has secured a new funding round, signaling strong growth in the payments space.',
    source_url: 'https://techcrunch.com/stripe-funding',
    source_name: 'TechCrunch',
    importance: 'high',
    detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: 'update-2',
    company_id: 'company-3',
    update_type: 'leadership_change',
    headline: 'Notion appoints new Chief Revenue Officer',
    summary: 'Former Salesforce executive joins Notion as CRO to lead enterprise expansion.',
    source_url: 'https://www.notion.so/blog/new-cro',
    source_name: 'Notion Blog',
    importance: 'critical',
    detected_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    affected_contacts: ['contact-1'],
  },
  {
    id: 'update-3',
    company_id: 'company-2',
    update_type: 'expansion',
    headline: 'Shopify expands to Southeast Asia',
    summary: 'Shopify announces new regional headquarters in Singapore.',
    source_url: 'https://news.shopify.com/expansion',
    source_name: 'Shopify News',
    importance: 'medium',
    detected_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
  },
];

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      trackedCompanies: [],
      selectedCompany: null,
      searchResults: [],
      searchQuery: '',
      updates: [],
      unreadCount: 0,
      isLoading: false,
      isSearching: false,
      isRefreshing: false,
      error: null,
      errorCode: null,

      fetchTrackedCompanies: async () => {
        set({ isLoading: true, error: null, errorCode: null });
        try {
          const response = await companiesApi.getTracked();
          set({
            trackedCompanies: response.items,
            isLoading: false,
          });
        } catch (error) {
          // Use demo data in development
          console.log('Using demo tracked companies');
          set({
            trackedCompanies: DEMO_TRACKED_COMPANIES,
            isLoading: false,
          });
        }
      },

      searchCompanies: async (query: string) => {
        if (!query.trim()) {
          set({ searchResults: [], searchQuery: '' });
          return;
        }

        set({ isSearching: true, searchQuery: query, error: null });
        try {
          const response = await companiesApi.search(query);
          set({ searchResults: response.results, isSearching: false });
        } catch (error) {
          const apiError = parseApiError(error);
          // Provide mock search results for demo
          set({
            searchResults: [
              {
                name: query,
                domain: `${query.toLowerCase().replace(/\s+/g, '')}.com`,
                industry: 'Technology',
                headquarters: 'United States',
                employee_count: '100-500',
                is_already_tracked: false,
              },
            ],
            isSearching: false,
            error: apiError.message,
          });
        }
      },

      trackCompany: async (company: CompanySearchResult) => {
        set({ isLoading: true, error: null, errorCode: null });
        try {
          const tracked = await companiesApi.track(company);
          set((state) => ({
            trackedCompanies: [tracked, ...state.trackedCompanies],
            searchResults: state.searchResults.map((r) =>
              r.name === company.name ? { ...r, is_already_tracked: true } : r
            ),
            isLoading: false,
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          // Demo mode: add locally
          const demoTracked: TrackedCompany = {
            id: `company-${Date.now()}`,
            company_name: company.name,
            domain: company.domain,
            industry: company.industry,
            headquarters: company.headquarters,
            logo_url: company.logo_url,
            website: company.website,
            employee_count: company.employee_count,
            linkedin_url: company.linkedin_url,
            added_at: new Date().toISOString(),
            added_by: 'current-user',
            last_updated: new Date().toISOString(),
            update_frequency: 'daily',
            is_priority: false,
            tags: [],
          };
          set((state) => ({
            trackedCompanies: [demoTracked, ...state.trackedCompanies],
            searchResults: state.searchResults.map((r) =>
              r.name === company.name ? { ...r, is_already_tracked: true } : r
            ),
            isLoading: false,
          }));
        }
      },

      untrackCompany: async (companyId: string) => {
        set({ isLoading: true, error: null });
        try {
          await companiesApi.untrack(companyId);
          set((state) => ({
            trackedCompanies: state.trackedCompanies.filter((c) => c.id !== companyId),
            selectedCompany: state.selectedCompany?.id === companyId ? null : state.selectedCompany,
            isLoading: false,
          }));
        } catch (error) {
          // Demo mode: remove locally
          set((state) => ({
            trackedCompanies: state.trackedCompanies.filter((c) => c.id !== companyId),
            selectedCompany: state.selectedCompany?.id === companyId ? null : state.selectedCompany,
            isLoading: false,
          }));
        }
      },

      selectCompany: async (companyId: string) => {
        set({ isLoading: true, error: null });
        try {
          const details = await companiesApi.getDetails(companyId);
          set({ selectedCompany: details, isLoading: false });
        } catch (error) {
          // Demo mode: create mock details
          const company = get().trackedCompanies.find((c) => c.id === companyId);
          if (company) {
            const mockDetails: TrackedCompanyDetails = {
              ...company,
              contacts: [
                {
                  id: 'contact-1',
                  company_id: companyId,
                  name: 'John Smith',
                  title: 'VP of Sales',
                  department: 'sales',
                  email: 'john.smith@example.com',
                  linkedin_url: 'https://linkedin.com/in/johnsmith',
                  is_decision_maker: true,
                  is_verified: true,
                  verification_score: 95,
                  last_verified: new Date().toISOString(),
                },
                {
                  id: 'contact-2',
                  company_id: companyId,
                  name: 'Sarah Johnson',
                  title: 'CEO',
                  department: 'executive',
                  email: 'sarah@example.com',
                  linkedin_url: 'https://linkedin.com/in/sarahjohnson',
                  is_decision_maker: true,
                  is_verified: true,
                  verification_score: 90,
                  last_verified: new Date().toISOString(),
                },
              ],
              recent_updates: DEMO_UPDATES.filter((u) => u.company_id === companyId),
              ai_insights: 'This company shows strong buying signals with recent leadership changes and expansion plans.',
              next_update_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
            set({ selectedCompany: mockDetails, isLoading: false });
          }
        }
      },

      clearSelection: () => set({ selectedCompany: null }),

      updateCompanySettings: async (companyId, settings) => {
        try {
          const updated = await companiesApi.updateTracking(companyId, settings);
          set((state) => ({
            trackedCompanies: state.trackedCompanies.map((c) =>
              c.id === companyId ? updated : c
            ),
          }));
        } catch {
          // Demo mode: update locally
          set((state) => ({
            trackedCompanies: state.trackedCompanies.map((c) =>
              c.id === companyId ? { ...c, ...settings } : c
            ),
          }));
        }
      },

      fetchUpdates: async (filter) => {
        set({ isLoading: true, error: null });
        try {
          const response = await companiesApi.getUpdates(1, 50, filter);
          const unreadCount = response.items.filter((u) => !u.is_read).length;
          set({ updates: response.items, unreadCount, isLoading: false });
        } catch {
          // Demo data
          const updates = filter?.unread_only
            ? DEMO_UPDATES.filter((u) => !u.is_read)
            : DEMO_UPDATES;
          set({
            updates,
            unreadCount: updates.filter((u) => !u.is_read).length,
            isLoading: false,
          });
        }
      },

      markUpdatesRead: async (updateIds: string[]) => {
        try {
          await companiesApi.markUpdatesRead(updateIds);
        } catch {
          // Continue with local update
        }
        set((state) => ({
          updates: state.updates.map((u) =>
            updateIds.includes(u.id) ? { ...u, is_read: true } : u
          ),
          unreadCount: state.updates.filter((u) => !u.is_read && !updateIds.includes(u.id)).length,
        }));
      },

      refreshCompany: async (companyId: string) => {
        set({ isRefreshing: true, error: null });
        try {
          const details = await companiesApi.refreshCompany(companyId);
          set((state) => ({
            trackedCompanies: state.trackedCompanies.map((c) =>
              c.id === companyId ? { ...c, last_updated: new Date().toISOString() } : c
            ),
            selectedCompany: state.selectedCompany?.id === companyId ? details : state.selectedCompany,
            isRefreshing: false,
          }));
        } catch {
          set({ isRefreshing: false });
        }
      },

      clearSearch: () => set({ searchResults: [], searchQuery: '' }),

      reset: () => set({
        trackedCompanies: [],
        selectedCompany: null,
        searchResults: [],
        searchQuery: '',
        updates: [],
        unreadCount: 0,
        isLoading: false,
        isSearching: false,
        isRefreshing: false,
        error: null,
        errorCode: null,
      }),
    }),
    {
      name: 'linq-companies-storage',
      partialize: (state) => ({
        trackedCompanies: state.trackedCompanies,
      }),
    }
  )
);
