/**
 * Company store using Zustand
 */
import { create } from 'zustand';
import { searchApi, type CompanyIntelligence } from '@/shared/api';

interface CompanyState {
  currentCompany: CompanyIntelligence | null;
  isLoading: boolean;
  error: string | null;
  analyzeCompany: (companyName: string, country?: string) => Promise<void>;
  setCurrentCompany: (company: CompanyIntelligence | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  currentCompany: null,
  isLoading: false,
  error: null,

  analyzeCompany: async (companyName: string, country: string = 'Nigeria') => {
    set({ isLoading: true, error: null });
    try {
      const intelligence = await searchApi.analyzeCompany(companyName, country);
      set({ currentCompany: intelligence, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to analyze company';
      set({ error: message, isLoading: false });
    }
  },

  setCurrentCompany: (company) => set({ currentCompany: company, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ currentCompany: null, isLoading: false, error: null }),
}));
