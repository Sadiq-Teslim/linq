import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    company_name: "",
    full_name: "",
    email: "",
    password: "",
    industry: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.auth.register(formData);
      const data = response.data;

      login(data.user, data.access_token);
      localStorage.setItem("linq_token", data.access_token);
      localStorage.setItem("linq_user", JSON.stringify(data.user));

      navigate("/dashboard/overview");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const response = await api.auth.googleAuth();
      if (response.data?.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        setError("Google authentication is not available. Please use email/password.");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Google signup failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all";

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center px-4 py-12">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-[#0a0f1c] to-[#0a0f1c]"></div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-[#0a0f1c] font-bold text-sm">L</span>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">LINQ</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-serif text-white mb-2">Create your account</h1>
            <p className="text-slate-400 text-sm">Start your free trial today</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#0a0f1c] text-slate-500">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
              <input
                type="text"
                name="company_name"
                placeholder="Your company"
                value={formData.company_name}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                placeholder="Your full name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create a password (min 8 chars)"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
                className={`${inputClass} appearance-none`}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
              >
                <option value="" className="bg-[#0a0f1c]">Select your industry</option>
                <option value="Technology" className="bg-[#0a0f1c]">Technology</option>
                <option value="Financial Services" className="bg-[#0a0f1c]">Financial Services</option>
                <option value="Healthcare" className="bg-[#0a0f1c]">Healthcare</option>
                <option value="Manufacturing" className="bg-[#0a0f1c]">Manufacturing</option>
                <option value="Retail" className="bg-[#0a0f1c]">Retail</option>
                <option value="Professional Services" className="bg-[#0a0f1c]">Professional Services</option>
                <option value="Other" className="bg-[#0a0f1c]">Other</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0a0f1c]/20 border-t-[#0a0f1c] rounded-full animate-spin"></div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            By signing up, you agree to our{" "}
            <a href="#" className="text-slate-400 hover:text-white">Terms</a>
            {" "}and{" "}
            <a href="#" className="text-slate-400 hover:text-white">Privacy Policy</a>
          </p>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/auth/login")}
                className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
