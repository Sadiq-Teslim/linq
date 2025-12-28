import { useState, useEffect } from "react";
import { Button, Card, Input } from "../../components";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export const DashboardSettings = () => {
  const { token, user } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

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

    try {
      await api.organization.inviteTeamMember(token, inviteEmail);
      setInviteEmail("");
      // Refresh team members
      const response = await api.organization.getTeamMembers(token);
      setTeamMembers(response.data.team_members || []);
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
      // Refresh team members
      const response = await api.organization.getTeamMembers(token);
      setTeamMembers(response.data.team_members || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove team member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-indigo-600 text-4xl">⟳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account and team</p>
      </div>

      {/* Team Members */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Team Members</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4 mb-6">
          <Input
            label="Add Team Member Email"
            type="email"
            placeholder="team@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <Button type="submit" loading={inviting}>
            Invite Member
          </Button>
        </form>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Current Team Members ({teamMembers.length})
          </h3>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {member.full_name || member.email}
                  </p>
                  <p className="text-sm text-slate-600">{member.email}</p>
                  <span className="inline-block mt-1 text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                    {member.role}
                  </span>
                </div>
                {member.id !== user?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(member.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Account Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
        <div className="space-y-4">
          <Input label="Full Name" defaultValue={user?.full_name || ""} disabled />
          <Input label="Email" defaultValue={user?.email || ""} disabled />
          <p className="text-sm text-slate-600">
            Contact support to update your account information
          </p>
        </div>
      </Card>
    </div>
  );
};
