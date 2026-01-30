import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

// Declare Paystack types
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        callback: (response: { reference: string; status: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export const DashboardPayment = () => {
  const { token, user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  // Check if Paystack is loaded
  useEffect(() => {
    const checkPaystack = () => {
      if (window.PaystackPop) {
        setPaystackLoaded(true);
      } else {
        setTimeout(checkPaystack, 100);
      }
    };
    checkPaystack();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const [plansResponse, subscriptionResponse, historyResponse] = await Promise.all([
          api.subscription.getPlans().catch(() => ({ data: [] })),
          api.subscription.getCurrent(token).catch(() => ({ data: null })),
          api.subscription.getPaymentHistory(token).catch(() => ({ data: { payments: [] } })),
        ]);
        
        setPlans(plansResponse.data || []);
        setSubscription(subscriptionResponse.data);
        setPaymentHistory(historyResponse?.data?.payments || []);
      } catch (error) {
        console.error("Failed to fetch payment data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [token]);

  const handleSubscribe = async (planName: string) => {
    if (!token || !paystackLoaded) {
      alert("Payment system is loading. Please try again.");
      return;
    }
    
    setLoading(true);
    setSelectedPlan(planName);
    
    const callbackUrl = `${window.location.origin}/payment-callback`;

    try {
      const response = await api.subscription.initializePaystackPayment(
        token,
        planName.toLowerCase(),
        callbackUrl
      );
      
      const { reference, public_key, amount, currency } = response.data;
      
      console.log("Paystack config received:", { reference, amount, currency });
      
      if (!public_key || !reference) {
        alert("Failed to initialize payment. Please try again.");
        setLoading(false);
        return;
      }

      // Initialize Paystack popup
      const handler = window.PaystackPop.setup({
        key: public_key,
        email: user?.email || "",
        amount: amount, // Amount in kobo
        currency: currency || "NGN",
        ref: reference,
        callback: (response) => {
          console.log("Payment successful:", response);
          // Redirect to callback for verification
          window.location.href = `${callbackUrl}?reference=${response.reference}`;
        },
        onClose: () => {
          setLoading(false);
          setSelectedPlan(null);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Payment initialization failed:", error);
      alert("Failed to initialize payment. Please try again.");
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString("en-NG")}`;
  };

  const currentPlan = subscription?.plan || "free_trial";
  
  // Check if subscription is actually active (status is active AND period hasn't ended)
  const isSubscriptionExpired = (() => {
    if (!subscription?.current_period_end) return false;
    const endDate = new Date(subscription.current_period_end);
    return endDate < new Date();
  })();
  
  const isSubscriptionActive = (subscription?.status === "active" || subscription?.status === "trialing") && !isSubscriptionExpired;
  const hasActivePaidPlan = isSubscriptionActive && currentPlan !== "free_trial";

  if (loadingData) {
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
        <h1 className="text-2xl md:text-3xl font-serif text-white mb-2">Billing & Plans</h1>
        <p className="text-slate-400">Manage your subscription and payments</p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <div className={`p-6 rounded-xl border ${
          isSubscriptionActive 
            ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20" 
            : "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20"
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-slate-400">Current Plan</p>
                {isSubscriptionActive ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                    Active
                  </span>
                ) : isSubscriptionExpired ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                    Expired
                  </span>
                ) : null}
              </div>
              <p className="text-2xl font-serif text-white capitalize mb-2">
                {currentPlan.replace("_", " ")}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className={`flex items-center gap-1.5 ${isSubscriptionActive ? "text-green-400" : "text-red-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSubscriptionActive ? "bg-green-400" : "bg-red-400"}`}></span>
                  {isSubscriptionExpired ? "expired" : subscription.status}
                </span>
                {subscription.current_period_end && (
                  <span className="text-slate-400">
                    {isSubscriptionActive ? "Renews" : "Expired on"}: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </span>
                )}
                {subscription.max_tracked_companies && (
                  <span className="text-slate-500">
                    {subscription.max_tracked_companies === -1 ? "Unlimited" : subscription.max_tracked_companies} companies
                  </span>
                )}
              </div>
            </div>
            {!isSubscriptionActive && (
              <button
                onClick={() => handleSubscribe(currentPlan)}
                disabled={loading || !paystackLoaded}
                className="px-6 py-2.5 rounded-lg font-medium text-sm text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : !paystackLoaded ? (
                  "Loading..."
                ) : (
                  "Renew Subscription"
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Available Plans</h2>
          {hasActivePaidPlan && (
            <span className="text-xs text-slate-500">
              You have an active subscription. Contact support to change plans.
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans
            .filter((plan) => plan.id !== "free_trial")
            .map((plan, index) => {
              const isCurrentPlan = currentPlan === plan.id;
              const isPlanExpired = isCurrentPlan && isSubscriptionExpired;
              // Only disable if there's an ACTIVE paid plan - expired plans should allow renewal
              const isDisabled = hasActivePaidPlan || loading || !paystackLoaded;
              
              return (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-xl border transition-all duration-300 ${
                    isCurrentPlan && isSubscriptionActive
                      ? "bg-gradient-to-b from-green-500/10 to-transparent border-green-500/30 ring-2 ring-green-500/20"
                      : isPlanExpired
                      ? "bg-gradient-to-b from-red-500/10 to-transparent border-red-500/30 ring-2 ring-red-500/20"
                      : plan.is_popular && !hasActivePaidPlan
                      ? "bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/30"
                      : "bg-white/[0.02] border-white/5"
                  } ${isDisabled && !isCurrentPlan ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Badges */}
                  {isCurrentPlan && isSubscriptionActive ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-medium text-[#0a0f1c] bg-gradient-to-r from-green-400 to-emerald-500 px-3 py-1 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Active Plan
                      </span>
                    </div>
                  ) : isPlanExpired ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-medium text-white bg-gradient-to-r from-red-500 to-red-600 px-3 py-1 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Expired
                      </span>
                    </div>
                  ) : plan.is_popular && !hasActivePaidPlan ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-medium text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  ) : null}
                  
                  <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-serif text-white">
                      {formatPrice(plan.price_monthly)}
                    </span>
                    <span className="text-sm text-slate-500">/month</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features?.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                        <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCurrentPlan && isSubscriptionActive ? "text-green-400" : "text-amber-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {isCurrentPlan && isSubscriptionActive ? (
                    <div className="w-full py-2.5 rounded-lg font-medium text-sm bg-green-500/10 text-green-400 border border-green-500/20 text-center">
                      Current Plan
                    </div>
                  ) : isPlanExpired ? (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading || !paystackLoaded}
                      className="w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0f1c] hover:from-amber-300 hover:to-amber-400"
                    >
                      {loading && selectedPlan === plan.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : !paystackLoaded ? (
                        "Loading..."
                      ) : (
                        "Renew Now"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => !isDisabled && handleSubscribe(plan.id)}
                      disabled={isDisabled}
                      className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                        isDisabled
                          ? "border border-white/10 text-slate-600 cursor-not-allowed"
                          : plan.is_popular
                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0f1c] hover:from-amber-300 hover:to-amber-400"
                          : "border border-white/10 text-white hover:bg-white/5"
                      }`}
                    >
                      {loading && selectedPlan === plan.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : !paystackLoaded ? (
                        "Loading..."
                      ) : hasActivePaidPlan ? (
                        "Unavailable"
                      ) : (
                        "Subscribe Now"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Payment History */}
      <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4">Payment History</h2>
        {paymentHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-400 mb-1">No payment history available</p>
            <p className="text-sm text-slate-500">
              Your payment history will appear here after your first transaction
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment: any, index: number) => (
                  <tr key={index} className="border-b border-white/5 last:border-0">
                    <td className="py-4 px-4 text-sm text-slate-400">
                      {payment.date ? new Date(payment.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-4 px-4 text-sm text-white capitalize">
                      {payment.plan?.replace("_", " ") || "—"}
                    </td>
                    <td className="py-4 px-4 text-sm text-white font-medium">
                      {payment.amount ? formatPrice(payment.amount / 100) : "—"}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === "success" 
                          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                          : payment.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          payment.status === "success" ? "bg-green-400" : payment.status === "pending" ? "bg-yellow-400" : "bg-red-400"
                        }`}></span>
                        {payment.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
