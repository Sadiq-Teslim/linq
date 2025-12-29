/**
 * API Response Transformers
 * Transform backend responses to match frontend types
 */
import type { CompanyContact } from "./types";

/**
 * Transform backend contact response to frontend format
 * Backend uses 'full_name', frontend may expect 'name' for backward compatibility
 */
export function transformContact(contact: any): CompanyContact {
  return {
    ...contact,
    // Map full_name to name for backward compatibility
    name: contact.full_name || contact.name,
    // Map confidence_score to verification_score if needed
    verification_score: contact.confidence_score ?? contact.verification_score ?? 0,
    // Ensure is_verified is set
    is_verified: contact.is_verified ?? (contact.confidence_score ? contact.confidence_score > 0.7 : false),
  };
}

/**
 * Transform array of contacts
 */
export function transformContacts(contacts: any[]): CompanyContact[] {
  return contacts.map(transformContact);
}

