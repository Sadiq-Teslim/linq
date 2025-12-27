import { create } from 'zustand';

interface CompanyData {
  profile: {
    name: string;
    summary: string;
    pain_point: string;
    readiness_score: number;
  };
  contact: {
    name: string;
    role: string;
    email: string;
    verification_score: number;
  } | null;
}

interface CompanyState {
  data: CompanyData | null;
  isLoading: boolean;
  setLoading: (status: boolean) => void;
  setData: (data: CompanyData) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  data: null,
  isLoading: false,
  setLoading: (status) => set({ isLoading: status }),
  setData: (data) => set({ data }),
}));