/**
 * Tracked Companies Store - Monitor Board
 * Uses real API calls - no mock data
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  companiesApi,
  type TrackedCompany,
  type TrackedCompanyDetails,
  type CompanySearchResult,
  type CompanyUpdate,
} from "@/shared/api";
import { parseApiError } from "@/shared/lib/errors";

interface CompanyState {
  // Tracked companies list
  trackedCompanies: TrackedCompany[];
  selectedCompany: TrackedCompanyDetails | null;
  viewMode: "details" | "contacts" | "updates"; // View mode for selected company

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
  selectCompany: (companyId: string, viewMode?: "details" | "contacts" | "updates") => Promise<void>;
  clearSelection: () => void;
  setViewMode: (mode: "details" | "contacts" | "updates") => void;
  updateCompanySettings: (
    companyId: string,
    settings: {
      is_priority?: boolean;
      update_frequency?: "daily" | "weekly" | "monthly";
      tags?: string[];
      notes?: string;
    },
  ) => Promise<void>;
  fetchUpdates: (filter?: { unread_only?: boolean }) => Promise<void>;
  markUpdatesRead: (updateIds: string[]) => Promise<void>;
  refreshCompany: (companyId: string) => Promise<void>;
  clearSearch: () => void;
  reset: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      trackedCompanies: [],
      selectedCompany: null,
      viewMode: "details",
      searchResults: [],
      searchQuery: "",
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
          const apiError = parseApiError(error);
          set({
            error: apiError.message,
            errorCode: apiError.code,
            isLoading: false,
          });
        }
      },

      searchCompanies: async (query: string) => {
        if (!query.trim()) {
          set({ searchResults: [], searchQuery: "" });
          return;
        }

        set({ isSearching: true, searchQuery: query, error: null });
        try {
          const response = await companiesApi.search(query);
          set({ searchResults: response.results, isSearching: false });
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            searchResults: [],
            isSearching: false,
            error: apiError.message,
            errorCode: apiError.code,
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
              r.name === company.name ? { ...r, is_already_tracked: true } : r,
            ),
            isLoading: false,
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            error: apiError.message,
            errorCode: apiError.code,
            isLoading: false,
          });
        }
      },

      untrackCompany: async (companyId: string) => {
        set({ isLoading: true, error: null });
        try {
          await companiesApi.untrack(companyId);
          set((state) => ({
            trackedCompanies: state.trackedCompanies.filter(
              (c) => c.id !== companyId,
            ),
            selectedCompany:
              state.selectedCompany?.id === companyId
                ? null
                : state.selectedCompany,
            isLoading: false,
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            error: apiError.message,
            isLoading: false,
          });
        }
      },

      selectCompany: async (companyId: string, viewMode: "details" | "contacts" | "updates" = "details") => {
        set({ isLoading: true, error: null });
        try {
          const details = await companiesApi.getDetails(companyId);
          set({ selectedCompany: details, viewMode, isLoading: false });
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            error: apiError.message,
            isLoading: false,
          });
        }
      },

      clearSelection: () => set({ selectedCompany: null, viewMode: "details" }),
      
      setViewMode: (mode: "details" | "contacts" | "updates") => set({ viewMode: mode }),

      updateCompanySettings: async (companyId, settings) => {
        try {
          const updated = await companiesApi.updateSettings(
            companyId,
            settings,
          );
          set((state) => ({
            trackedCompanies: state.trackedCompanies.map((c) =>
              c.id === companyId ? { ...c, ...updated } : c,
            ),
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          set({ error: apiError.message });
        }
      },

      fetchUpdates: async (filter) => {
        set({ isRefreshing: true, error: null });
        try {
          const response = await companiesApi.getUpdates(1, 50, filter);
          const unreadItems = response.items.filter((u) => !u.is_read);
          set({
            updates: response.items,
            unreadCount: unreadItems.length,
            isRefreshing: false,
          });
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            error: apiError.message,
            isRefreshing: false,
          });
        }
      },

      markUpdatesRead: async (updateIds) => {
        try {
          await companiesApi.markUpdatesRead(updateIds);
          set((state) => ({
            updates: state.updates.map((u) =>
              updateIds.includes(u.id) ? { ...u, is_read: true } : u,
            ),
            unreadCount: Math.max(0, state.unreadCount - updateIds.length),
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          set({ error: apiError.message });
        }
      },

      refreshCompany: async (companyId) => {
        set({ isRefreshing: true });
        try {
          const updated = await companiesApi.refresh(companyId);
          set((state) => ({
            trackedCompanies: state.trackedCompanies.map((c) =>
              c.id === companyId ? updated : c,
            ),
            selectedCompany:
              state.selectedCompany?.id === companyId
                ? { ...state.selectedCompany, ...updated }
                : state.selectedCompany,
            isRefreshing: false,
          }));
        } catch (error) {
          const apiError = parseApiError(error);
          set({
            error: apiError.message,
            isRefreshing: false,
          });
        }
      },

      clearSearch: () => set({ searchResults: [], searchQuery: "" }),

      reset: () =>
        set({
          trackedCompanies: [],
          selectedCompany: null,
          searchResults: [],
          searchQuery: "",
          updates: [],
          unreadCount: 0,
          error: null,
          errorCode: null,
        }),
    }),
    {
      name: "linq-company-store",
      partialize: (state) => ({
        trackedCompanies: state.trackedCompanies,
        updates: state.updates,
        unreadCount: state.unreadCount,
      }),
    },
  ),
);
