import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components";
import { api } from "../lib/api";

export const LandingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.subscription.getPlans();
        setPlans(response.data || []);
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        // Fallback plans
        setPlans([
          {
            id: "free_trial",
            name: "Free Trial",
            price_monthly: 0,
            currency: "NGN",
            features: [
              "Track up to 5 companies",
              "5 contacts per company",
              "Weekly updates",
              "7-day free trial",
            ],
          },
          {
            id: "starter",
            name: "Starter",
            price_monthly: 14500,
            currency: "NGN",
            features: [
              "Track up to 25 companies",
              "10 contacts per company",
              "Daily updates",
              "Email notifications",
              "3 team members",
            ],
          },
          {
            id: "professional",
            name: "Professional",
            price_monthly: 39500,
            currency: "NGN",
            is_popular: true,
            features: [
              "Track up to 100 companies",
              "25 contacts per company",
              "Real-time updates",
              "Email & browser notifications",
              "10 team members",
              "Priority support",
              "API access",
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    // Always display in Naira (Paystack supports NGN)
    return `₦${price.toLocaleString("en-NG")}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-indigo-600">LINQ</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate("/auth/login")}>
              Log In
            </Button>
            <Button onClick={() => navigate("/auth/signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Track Companies.{" "}
            <span className="text-indigo-600">Close More Deals.</span>
          </h1>
          <p className="text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            The all-in-one platform for sales teams to monitor target accounts,
            discover contacts, and get real-time industry updates. Like HubSpot
            meets Bloomberg for B2B sales.
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg" onClick={() => navigate("/auth/signup")}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="secondary">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What You Can Do With LINQ
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to identify, track, and engage with your ideal customers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Monitor Board",
                icon: "📊",
                description:
                  "Track the companies that matter most. Get automatic updates on funding, hiring, news, and key events. Never miss an opportunity to engage.",
                features: [
                  "Real-time company updates",
                  "Funding & acquisition alerts",
                  "Hiring & expansion news",
                  "Custom tracking lists",
                ],
              },
              {
                title: "Contact Discovery",
                icon: "👥",
                description:
                  "Find decision makers at your target accounts with verified contact information. Build your outreach list faster.",
                features: [
                  "Verified email addresses",
                  "LinkedIn profiles",
                  "Job titles & roles",
                  "Contact enrichment",
                ],
              },
              {
                title: "Industry Pulse",
                icon: "📰",
                description:
                  "Real-time news feed filtered to your industry. Stay informed about market trends, competitors, and opportunities.",
                features: [
                  "Industry-specific news",
                  "Competitor tracking",
                  "Market intelligence",
                  "Customizable filters",
                ],
              },
              {
                title: "Company Intelligence",
                icon: "🔍",
                description:
                  "Deep insights into companies with AI-powered analysis. Understand their needs, pain points, and buying signals.",
                features: [
                  "AI company analysis",
                  "Buying signals detection",
                  "Technology stack insights",
                  "Growth indicators",
                ],
              },
              {
                title: "Lead Export",
                icon: "📤",
                description:
                  "Export your tracked companies and contacts to CSV. Integrate with your CRM or sales tools seamlessly.",
                features: [
                  "CSV export",
                  "Bulk operations",
                  "CRM integration ready",
                  "Custom field mapping",
                ],
              },
              {
                title: "Team Collaboration",
                icon: "🤝",
                description:
                  "Add team members to your plan. Share tracked companies, collaborate on leads, and scale your sales efforts.",
                features: [
                  "Multi-user access",
                  "Shared company lists",
                  "Team permissions",
                  "Activity tracking",
                ],
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-8 rounded-xl border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-slate-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item) => (
                    <li key={item} className="text-sm text-slate-600 flex items-start">
                      <span className="text-indigo-600 mr-2">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600">
              Choose the plan that fits your team size and needs
            </p>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin text-indigo-600 text-4xl">⟳</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-xl p-8 relative ${
                    plan.is_popular
                      ? "border-indigo-500 ring-2 ring-indigo-200 shadow-lg"
                      : "border-slate-200"
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-2xl font-semibold mb-2 text-slate-900">
                    {plan.name}
                  </h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-900">
                      {formatPrice(plan.price_monthly)}
                    </span>
                    <span className="text-slate-600 ml-2">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature: string) => (
                      <li key={feature} className="text-slate-600 flex items-start">
                        <span className="text-indigo-600 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    fullWidth
                    variant={plan.is_popular ? "primary" : "outline"}
                    onClick={() => navigate("/auth/signup")}
                  >
                    {plan.price_monthly === 0 ? "Start Free Trial" : "Choose Plan"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Close More Deals?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of sales teams using LINQ to track companies and grow revenue
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/auth/signup")}
          >
            Start Free Trial - No Credit Card Required
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-indigo-600">LINQ</span>
              <p className="text-sm text-slate-600 mt-2">
                © 2024 LINQ. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-slate-600 hover:text-indigo-600">
                Privacy
              </a>
              <a href="#" className="text-sm text-slate-600 hover:text-indigo-600">
                Terms
              </a>
              <a href="#" className="text-sm text-slate-600 hover:text-indigo-600">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
