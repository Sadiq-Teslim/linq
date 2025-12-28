import { useState, useEffect } from "react";
import { Button, Card } from "../../components";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export const DashboardAccessCode = () => {
  const { token } = useAuthStore();
  const [copiedMessage, setCopiedMessage] = useState("");
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchAccessCodes = async () => {
      if (!token) return;
      try {
        const response = await api.subscription.listAccessCodes(token);
        setAccessCodes(response.data || []);
      } catch (error) {
        console.error("Failed to fetch access codes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccessCodes();
  }, [token]);

  const handleGenerate = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const response = await api.subscription.generateAccessCode(token);
      const newCode = response.data;
      setAccessCodes([newCode, ...accessCodes]);
    } catch (error) {
      console.error("Failed to generate access code:", error);
      alert("Failed to generate access code. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedMessage(code);
    setTimeout(() => setCopiedMessage(""), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-indigo-600 text-4xl">⟳</div>
      </div>
    );
  }

  const activeCode = accessCodes.find((code) => code.is_active && !code.is_used) || accessCodes[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Access Code</h1>
          <p className="text-slate-600 mt-2">
            Use this code to activate the Chrome extension
          </p>
        </div>
        <Button onClick={handleGenerate} loading={generating}>
          Generate New Code
        </Button>
      </div>

      {activeCode ? (
        <Card className="p-8 text-center">
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-2">Your Access Code</p>
            <div className="bg-slate-100 p-6 rounded-lg border-2 border-slate-300 font-mono text-2xl font-bold text-slate-900 break-all">
              {activeCode.code}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {activeCode.is_used ? "Used" : activeCode.is_active ? "Active" : "Inactive"}
              {activeCode.expires_at && (
                <> • Expires: {new Date(activeCode.expires_at).toLocaleDateString()}</>
              )}
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => handleCopy(activeCode.code)}
          >
            {copiedMessage === activeCode.code ? "Copied!" : "Copy Code"}
          </Button>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-slate-600 mb-4">No access codes generated yet</p>
          <Button onClick={handleGenerate} loading={generating}>
            Generate Your First Code
          </Button>
        </Card>
      )}

      {accessCodes.length > 1 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Access Codes</h2>
          <div className="space-y-3">
            {accessCodes.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-mono text-sm font-medium text-slate-900">
                    {code.code}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                    <span>
                      Created: {new Date(code.created_at).toLocaleDateString()}
                    </span>
                    {code.expires_at && (
                      <span>
                        Expires: {new Date(code.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded ${
                      code.is_used
                        ? "bg-red-100 text-red-700"
                        : code.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {code.is_used ? "Used" : code.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(code.code)}
                >
                  {copiedMessage === code.code ? "Copied!" : "Copy"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-slate-900 mb-2">How to use</h3>
        <ol className="text-sm text-slate-700 space-y-2">
          <li>1. Open the Chrome extension</li>
          <li>2. Paste your access code</li>
          <li>3. Start using LINQ</li>
        </ol>
        <p className="text-xs text-slate-600 mt-4">
          Note: The extension is limited to inputting access codes and basic usage. 
          All other features are managed from this dashboard.
        </p>
      </Card>
    </div>
  );
};
