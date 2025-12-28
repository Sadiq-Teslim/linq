import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { AlertModal } from "../../components/Modal";

export const DashboardAccessCode = () => {
  const { token } = useAuthStore();
  const [copiedMessage, setCopiedMessage] = useState("");
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>({ title: "", message: "", type: "info" });

  const showModal = (title: string, message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setModalConfig({ title, message, type });
    setModalOpen(true);
  };

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
      showModal("Success", "Access code generated successfully!", "success");
    } catch (error: any) {
      console.error("Failed to generate access code:", error);
      showModal(
        "Error",
        error.response?.data?.detail || "Failed to generate access code. Please try again.",
        "error"
      );
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
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeCode = accessCodes.find((code) => code.is_active && !code.is_used) || accessCodes[0];

  return (
    <div className="space-y-8">
      {/* Modal */}
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white mb-2">Access Code</h1>
          <p className="text-slate-400">Use this code to activate the Chrome extension</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-2.5 rounded-lg font-medium text-sm text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <div className="w-4 h-4 border-2 border-[#0a0f1c]/20 border-t-[#0a0f1c] rounded-full animate-spin"></div>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generate New Code
            </>
          )}
        </button>
      </div>

      {/* Main Code Display */}
      {activeCode ? (
        <div className="p-8 rounded-xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 text-center">
          <p className="text-sm text-slate-400 mb-3">Your Access Code</p>
          <div className="bg-[#0a0f1c] p-6 rounded-xl border border-white/10 mb-4">
            <p className="font-mono text-2xl md:text-3xl font-bold text-white tracking-wider break-all">
              {activeCode.code}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm mb-6">
            <span className={`flex items-center gap-1.5 ${
              activeCode.is_used ? "text-red-400" : activeCode.is_active ? "text-green-400" : "text-slate-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                activeCode.is_used ? "bg-red-400" : activeCode.is_active ? "bg-green-400" : "bg-slate-400"
              }`}></span>
              {activeCode.is_used ? "Used" : activeCode.is_active ? "Active" : "Inactive"}
            </span>
            {activeCode.expires_at && (
              <span className="text-slate-500">
                Expires: {new Date(activeCode.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            onClick={() => handleCopy(activeCode.code)}
            className="px-8 py-3 rounded-lg font-medium text-sm text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all inline-flex items-center gap-2"
          >
            {copiedMessage === activeCode.code ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-12 rounded-xl bg-white/[0.02] border border-white/5 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <p className="text-slate-400 mb-4">No access codes generated yet</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-lg font-medium text-sm text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50"
          >
            Generate Your First Code
          </button>
        </div>
      )}

      {/* All Access Codes */}
      {accessCodes.length > 1 && (
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">All Access Codes</h2>
          <div className="space-y-3">
            {accessCodes.map((code, index) => (
              <div
                key={code.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-white truncate">
                    {code.code}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>Created: {new Date(code.created_at).toLocaleDateString()}</span>
                    {code.expires_at && (
                      <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full border ${
                      code.is_used
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : code.is_active
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-white/5 text-slate-400 border-white/10"
                    }`}>
                      {code.is_used ? "Used" : code.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(code.code)}
                  className="text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  {copiedMessage === code.code ? "Copied!" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to use */}
      <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to use
        </h3>
        <ol className="text-sm text-slate-300 space-y-2 ml-7">
          <li>1. Install the Chrome extension</li>
          <li>2. Open the extension and paste your access code</li>
          <li>3. Start using LINQ to track companies</li>
        </ol>
        <p className="text-xs text-slate-500 mt-4 ml-7">
          Note: The extension is limited to inputting access codes and basic usage. 
          All other features are managed from this dashboard.
        </p>
      </div>
    </div>
  );
};
