import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: storeToken, isAuthenticated, restoreSession } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get("reference");

      if (!reference) {
        setStatus("error");
        setMessage("No payment reference found");
        return;
      }

      // Wait a moment for zustand to hydrate, then check auth
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to get token from store first
      let token = storeToken;

      // Fallback: check localStorage if store is empty
      if (!token) {
        token = localStorage.getItem("linq_token");
        const userStr = localStorage.getItem("linq_user");

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            restoreSession(user, token);
          } catch {
            // Invalid user data
            token = null;
          }
        }
      }

      if (!token) {
        setStatus("error");
        setMessage("Session expired. Please log in and try again.");
        setHasToken(false);
        return;
      }

      setHasToken(true);

      try {
        // Verify payment with Paystack
        const response = await api.subscription.verifyPaystackPayment(
          token,
          reference,
        );
        const data = response.data;

        if (data.verified) {
          setStatus("success");
          setMessage("Your subscription has been activated.");
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate("/dashboard/overview", { replace: true });
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.message || "Payment verification failed");
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.response?.data?.detail ||
            "Payment verification failed. Please contact support.",
        );
      }
    };

    verifyPayment();
  }, [searchParams, storeToken, isAuthenticated, navigate, restoreSession]);

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-[#0a0f1c] to-[#0a0f1c]"></div>

      <div className="relative w-full max-w-md bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center backdrop-blur-sm">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-serif text-white mb-2">
              Verifying Payment
            </h2>
            <p className="text-slate-400 text-sm">
              Please wait while we confirm your payment...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-slate-400 text-sm mb-4">{message}</p>
            <p className="text-xs text-slate-500">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-white mb-2">
              Payment Issue
            </h2>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (hasToken) {
                    navigate("/dashboard/payment", { replace: true });
                  } else {
                    navigate("/auth/login", { replace: true });
                  }
                }}
                className="w-full py-2.5 rounded-lg font-medium text-sm text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all"
              >
                {hasToken ? "Go to Payment Page" : "Log In"}
              </button>
              <button
                onClick={() => navigate("/", { replace: true })}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
