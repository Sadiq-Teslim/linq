import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(error);
      setTimeout(() => {
        navigate(`/auth/login?error=${error}`);
      }, 2000);
      return;
    }

    if (token && email) {
      const user = {
        id: "",
        email: email,
        full_name: email.split("@")[0],
      };

      login(user, token);
      localStorage.setItem("linq_token", token);
      localStorage.setItem("linq_user", JSON.stringify(user));

      setTimeout(() => {
        navigate("/dashboard/overview");
      }, 1000);
    } else {
      setStatus("error");
      setErrorMessage("Authentication failed. Please try again.");
      setTimeout(() => {
        navigate("/auth/login?error=no_token");
      }, 2000);
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-[#0a0f1c] to-[#0a0f1c]"></div>
      
      <div className="relative w-full max-w-md bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center backdrop-blur-sm">
        {status === "loading" ? (
          <>
            <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-serif text-white mb-2">
              Completing Sign In
            </h2>
            <p className="text-slate-400 text-sm">Please wait while we authenticate you...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-white mb-2">
              Authentication Failed
            </h2>
            <p className="text-slate-400 text-sm mb-4">{errorMessage}</p>
            <p className="text-xs text-slate-500">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
};
