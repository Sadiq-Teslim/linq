import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { Card } from "../components";

export const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get("reference");
      
      if (!reference) {
        setStatus("error");
        setMessage("No payment reference found");
        return;
      }

      if (!token) {
        setStatus("error");
        setMessage("Not authenticated");
        return;
      }

      try {
        const response = await api.subscription.verifyPaystackPayment(token, reference);
        const data = response.data;

        if (data.verified) {
          setStatus("success");
          setMessage("Payment successful! Your subscription has been activated.");
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate("/dashboard/overview");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Payment verification failed");
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(error.response?.data?.detail || "Payment verification failed");
      }
    };

    verifyPayment();
  }, [searchParams, token, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin text-indigo-600 text-4xl mb-4">⟳</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Verifying Payment
            </h2>
            <p className="text-slate-600">Please wait...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-slate-600 mb-4">{message}</p>
            <p className="text-sm text-slate-500">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-600 text-4xl mb-4">✗</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Payment Failed
            </h2>
            <p className="text-slate-600 mb-4">{message}</p>
            <button
              onClick={() => navigate("/dashboard/payment")}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Go to Payment Page
            </button>
          </>
        )}
      </Card>
    </div>
  );
};

