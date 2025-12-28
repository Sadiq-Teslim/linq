import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export const DashboardSettings = () => {
  const { token, user } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!token) return;
      try {
        const response = await api.organization.getTeamMembers(token);
        setTeamMembers(response.data.team_members || []);
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamMembers();
  }, [token]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteEmail) return;

    setInviting(true);
    setError("");
    setSuccess("");

    try {
      await api.organization.inviteTeamMember(token, inviteEmail);
      setInviteEmail("");
      setSuccess("Invitation sent successfully!");
      const response = await api.organization.getTeamMembers(token);
      setTeamMembers(response.data.team_members || []);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to invite team member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to remove this team member?")) return;

    try {
      await api.organization.removeTeamMember(token, userId);
      const response = await api.organization.getTeamMembers(token);
      setTeamMembers(response.data.team_members || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove team member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your account and team</p>
      </div>

      {/* Team Members */}
      <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-6">Team Members</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleInvite} className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Add Team Member
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="team@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-6 py-3 rounded-lg font-medium text-sm text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {inviting ? (
                <div className="w-4 h-4 border-2 border-[#0a0f1c]/20 border-t-[#0a0f1c] rounded-full animate-spin"></div>
              ) : (
                "Invite"
              )}
            </button>
          </div>
        </form>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">
            Current Team Members ({teamMembers.length})
          </h3>
          <div className="space-y-3">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-medium">
                    {(member.full_name || member.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {member.full_name || member.email}
                    </p>
                    <p className="text-sm text-slate-400">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {member.role}
                  </span>
                  {member.id !== user?.id && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-6">Account Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              value={user?.full_name || ""}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 text-slate-400 cursor-not-allowed"
            />
          </div>
          <p className="text-sm text-slate-500">
            Contact support to update your account information
          </p>
        </div>
      </div>
    </div>
  );
};
