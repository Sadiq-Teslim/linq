import React from "react";
import {
  Users,
  Mail,
  Phone,
  Linkedin,
  Copy,
  Check,
  Shield,
  Clock,
} from "lucide-react";

interface Contact {
  id: number | string;
  full_name?: string;
  name?: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  is_decision_maker?: boolean;
  is_verified?: boolean;
  verification_score?: number;
  updated_at?: string;
  created_at?: string;
}

interface ContactSectionsProps {
  contacts: Contact[];
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const isRecentlyChanged = (updatedAt?: string) => {
  if (!updatedAt) return false;
  const date = new Date(updatedAt);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / 3600000;
  return diffHours < 24; // Changed in last 24 hours
};

const ContactCard: React.FC<{
  contact: Contact;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}> = ({ contact, copiedField, onCopy }) => {
  const recentlyChanged = isRecentlyChanged(contact.updated_at);

  return (
    <div
      className={`p-3 bg-white rounded-lg border ${
        recentlyChanged ? "border-green-300 bg-green-50" : "border-blue-200"
      } transition-all shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-blue-950 truncate">
              {contact.full_name || contact.name || "Unknown"}
            </p>
            {contact.is_decision_maker && (
              <span className="text-[10px] bg-green-700/20 text-green-700 px-1.5 py-0.5 rounded border border-green-700/30 font-medium">
                DM
              </span>
            )}
            {contact.is_verified && (
              <span className="text-[10px] bg-blue-500/20 text-blue-700 px-1.5 py-0.5 rounded border border-blue-500/30 font-medium flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                Verified
              </span>
            )}
            {recentlyChanged && (
              <span className="text-[10px] bg-green-500/20 text-green-700 px-1.5 py-0.5 rounded border border-green-500/30 font-medium flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Recent
              </span>
            )}
          </div>
          {contact.title && (
            <p className="text-xs text-slate-600 mt-1 truncate">{contact.title}</p>
          )}
          {contact.department && contact.department !== "other" && (
            <p className="text-xs text-slate-500 truncate">{contact.department}</p>
          )}
          {contact.updated_at && (
            <p className="text-[10px] text-slate-400 mt-1">
              Updated {formatTimeAgo(contact.updated_at)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {contact.email && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`mailto:${contact.email}`}
                  className="text-xs text-blue-700 hover:text-blue-600 flex items-center gap-1.5 px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                  title={contact.email}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[120px]">{contact.email}</span>
                </a>
                <button
                  onClick={() => contact.email && onCopy(contact.email, `email-${contact.id}`)}
                  className="p-1 text-blue-700 hover:text-blue-600 transition-colors"
                  title="Copy email"
                >
                  {copiedField === `email-${contact.id}` ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${contact.phone}`}
                  className="text-xs text-blue-700 hover:text-blue-600 flex items-center gap-1.5 px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                  title={contact.phone}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{contact.phone}</span>
                </a>
                <button
                  onClick={() => contact.phone && onCopy(contact.phone, `phone-${contact.id}`)}
                  className="p-1 text-blue-700 hover:text-blue-600 transition-colors"
                  title="Copy phone"
                >
                  {copiedField === `phone-${contact.id}` ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
            {contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 hover:text-green-600 flex items-center gap-1.5 px-2 py-1 rounded bg-green-100 hover:bg-green-200 transition-colors"
                title="View LinkedIn profile"
              >
                <Linkedin className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactSections: React.FC<ContactSectionsProps> = ({
  contacts,
  copiedField,
  onCopy,
}) => {
  // Organize contacts into sections
  const decisionMakers = contacts.filter((c) => c.is_decision_maker);
  const verified = contacts.filter((c) => c.is_verified && !c.is_decision_maker);
  const recentChanges = contacts.filter(
    (c) => isRecentlyChanged(c.updated_at) && !c.is_decision_maker && !c.is_verified
  );
  const others = contacts.filter(
    (c) => !c.is_decision_maker && !c.is_verified && !isRecentlyChanged(c.updated_at)
  );

  // Get funding/event signals from company updates (would need to be passed as prop)
  // For now, we'll show a placeholder section

  const sections = [
    {
      title: "Decision Makers",
      icon: Users,
      contacts: decisionMakers,
      color: "green",
      description: "Key executives and decision-makers",
    },
    {
      title: "Verified Contacts",
      icon: Shield,
      contacts: verified,
      color: "blue",
      description: "Verified and validated contacts",
    },
    {
      title: "Recently Changed",
      icon: Clock,
      contacts: recentChanges,
      color: "green",
      description: "Recently updated contact information",
    },
    {
      title: "All Contacts",
      icon: Users,
      contacts: others,
      color: "blue",
      description: "Other contacts",
    },
  ].filter((section) => section.contacts.length > 0);

  if (contacts.length === 0) {
    return (
      <div className="py-6 text-center">
        <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No contacts found</p>
        <p className="text-xs text-slate-400 mt-1">
          Contacts will appear here once discovered
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center gap-2">
            {section.color === "green" ? (
              <section.icon className="w-4 h-4 text-green-700" />
            ) : (
              <section.icon className="w-4 h-4 text-blue-700" />
            )}
            <h5 className={`text-xs font-semibold ${
              section.color === "green" ? "text-green-700" : "text-blue-700"
            }`}>
              {section.title} ({section.contacts.length})
            </h5>
          </div>
          {section.description && (
            <p className="text-[10px] text-slate-500 mb-2">{section.description}</p>
          )}
          <div className="space-y-2">
            {section.contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                copiedField={copiedField}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

