/**
 * Lead entity types (Contact person)
 */
export interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  verificationScore: number;
  createdAt: string;
}
