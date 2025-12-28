import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../../components";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export const DashboardPayment = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
    if (!token) {
      console.error("No token found");
      return;
    }
    setLoading(true);
    
    const callbackUrl = `${window.location.origin}/payment-callback`;
    console.log("Subscribe clicked:", { planName: planName.toLowerCase(), callbackUrl, token });

    try {
      const response = await api.subscription.initializePaystackPayment(
        token,
        planName.toLowerCase(),
        callbackUrl
      );
      console.log("Paystack response:", response);
      if (response.data.authorization_url) {
        console.log("Redirecting to:", response.data.authorization_url);
        window.location.href = response.data.authorization_url;
      } else {
        console.error("No authorization_url in response:", response.data);
        alert("No payment URL returned. Please try again.");
      }
    } catch (error) {
      console.error("Payment initialization failed:", error);
      alert("Failed to initialize payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string = "NGN") => {
    // Always display in Naira (Paystack supports NGN)
    return `₦${price.toLocaleString("en-NG")}`;
  };

  const currentPlan = subscription?.plan || "free_trial";

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-indigo-600 text-4xl">⟳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing & Plans</h1>
        <p className="text-slate-600 mt-2">
          Manage your subscription and payments
        </p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <Card className="p-6 bg-indigo-50 border-indigo-200">
          <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-900 capitalize">
                {currentPlan.replace("_", " ")}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Status: <span className={`font-medium ${subscription.status === "active" ? "text-green-600" : "text-red-600"}`}>
                  {subscription.status}
                </span>
              </p>
              {subscription.current_period_end && (
                <p className="text-sm text-slate-600 mt-1">
                  Renews: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription.status !== "active" && (
              <Button onClick={() => handleSubscribe(currentPlan)}>
                Renew Subscription
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans
            .filter((plan) => plan.id !== "free_trial")
            .map((plan) => (
              <div
                key={plan.id}
                className={`cursor-pointer ${
                  currentPlan === plan.id ? "opacity-50" : ""
                }`}
                onClick={() => currentPlan !== plan.id && setSelectedPlan(plan.id)}
              >
                <Card
                  className={`p-6 transition ${
                    selectedPlan === plan.id
                      ? "border-indigo-500 ring-2 ring-indigo-200"
                      : ""
                  } ${plan.is_popular ? "border-indigo-300" : ""}`}
                >
                  {plan.is_popular && (
                    <div className="mb-2">
                      <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold mb-4">
                    {formatPrice(plan.price_monthly, plan.currency)}
                    <span className="text-sm text-slate-600">/month</span>
                  </p>
                  <ul className="space-y-2 mb-6">
                    {plan.features?.map((feature: string) => (
                      <li key={feature} className="text-sm text-slate-600 flex items-start">
                        <span className="text-indigo-600 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    fullWidth
                    variant={currentPlan === plan.id ? "outline" : "primary"}
                    loading={loading && selectedPlan === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={currentPlan === plan.id}
                  >
                    {currentPlan === plan.id ? "Current Plan" : "Subscribe Now"}
                  </Button>
                </Card>
              </div>
            ))}
        </div>
      </div>

      {/* Payment History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Payment History</h2>
        {paymentHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <p>No payment history available</p>
            <p className="text-sm mt-2">
              Your payment history will appear here after your first transaction
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {payment.date ? new Date(payment.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 capitalize">
                      {payment.plan?.replace("_", " ") || "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {payment.amount ? formatPrice(payment.amount / 100, payment.currency || "NGN") : "—"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.status === "success" 
                          ? "bg-green-100 text-green-700" 
                          : payment.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {payment.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
