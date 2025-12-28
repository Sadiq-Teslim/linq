import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
        setPlans([
          {
            id: "starter",
            name: "Starter",
            price_monthly: 14500,
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
            is_popular: true,
            features: [
              "Track up to 100 companies",
              "25 contacts per company",
              "Real-time updates",
              "Priority support",
              "10 team members",
              "API access",
            ],
          },
          {
            id: "enterprise",
            name: "Enterprise",
            price_monthly: 99500,
            features: [
              "Unlimited companies",
              "Unlimited contacts",
              "Dedicated support",
              "Custom integrations",
              "SSO & SAML",
              "SLA guarantee",
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
    return `₦${price.toLocaleString("en-NG")}`;
  };

  const features = [
    {
      title: "Company Monitor",
      description: "Track target accounts with automatic updates on funding, hiring, and key events.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: "Contact Discovery",
      description: "Find decision makers with verified emails and LinkedIn profiles.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: "Industry Pulse",
      description: "Real-time news feed filtered to your industry and tracked companies.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      title: "Smart Alerts",
      description: "Get notified when trigger events happen at your target accounts.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      title: "Chrome Extension",
      description: "Add companies from LinkedIn or any website with one click.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      title: "Team Collaboration",
      description: "Share tracked companies and coordinate outreach with your team.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1c]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1c]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-[#0a0f1c] font-bold text-sm">L</span>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">LINQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/auth/login")}
              className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/auth/signup")}
              className="text-sm font-medium text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2 rounded-lg transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-400 text-xs font-medium mb-8 opacity-0 animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            B2B Sales Intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 leading-[1.1] opacity-0 animate-fade-in-up animate-delay-100">
            Track Companies.
            <br />
            <span className="text-gradient">Close More Deals.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up animate-delay-200">
            The intelligence platform for sales teams. Monitor target accounts, discover contacts, 
            and get real-time updates that help you reach out at the perfect moment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-300">
            <button
              onClick={() => navigate("/auth/signup")}
              className="w-full sm:w-auto font-medium text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-8 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              Start Free Trial
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button className="w-full sm:w-auto text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 px-8 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Demo
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-20 grid grid-cols-3 gap-8 opacity-0 animate-fade-in-up animate-delay-400">
          {[
            { value: "10K+", label: "Companies Tracked" },
            { value: "50M+", label: "Contacts Available" },
            { value: "Real-time", label: "Updates" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-serif text-white mb-1">{stat.value}</div>
              <div className="text-xs md:text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-[#0a0f1c] to-[#0f172a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">
              Everything you need to win
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A complete sales intelligence toolkit that keeps you informed and ahead of the competition.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-[#0f172a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-400">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-xl border transition-all ${
                    plan.is_popular
                      ? "bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/30"
                      : "bg-white/[0.02] border-white/5 hover:border-white/10"
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-medium text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-serif text-white">
                        {formatPrice(plan.price_monthly)}
                      </span>
                      <span className="text-sm text-slate-500">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                        <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("/auth/signup")}
                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                      plan.is_popular
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0f1c] hover:from-amber-300 hover:to-amber-400"
                        : "border border-slate-700 text-white hover:bg-white/5"
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm text-slate-500 mt-8">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-[#0a0f1c]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">
            Ready to close more deals?
          </h2>
          <p className="text-slate-400 mb-8">
            Join sales teams using LINQ to stay ahead of the competition.
          </p>
          <button
            onClick={() => navigate("/auth/signup")}
            className="font-medium text-[#0a0f1c] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-8 py-3.5 rounded-lg transition-all"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 bg-[#0a0f1c]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-[#0a0f1c] font-bold text-xs">L</span>
            </div>
            <span className="text-sm text-slate-400">© 2024 LINQ. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
