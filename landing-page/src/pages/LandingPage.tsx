import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

// Icon components
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const NewspaperIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const TeamIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// Demo result data
const getDemoResults = (companyName: string) => ({
  company: {
    name: companyName || "Stripe",
    domain: companyName ? `${companyName.toLowerCase().replace(/\s+/g, '')}.com` : "stripe.com",
    industry: "Financial Technology",
    headquarters: "San Francisco, CA",
    employees: "5,000+",
    description: `${companyName || "Stripe"} is a leading technology company providing payment processing solutions for businesses of all sizes.`,
  },
  contacts: [
    { name: "John Smith", title: "VP of Sales", email: "j.smith@company.com" },
    { name: "Sarah Chen", title: "Head of Partnerships", email: "s.chen@company.com" },
    { name: "Mike Johnson", title: "Director of BD", email: "m.johnson@company.com" },
  ],
  insights: [
    "Recently raised $600M Series G at $95B valuation",
    "Expanding into 3 new markets in Q2 2024",
    "Hiring aggressively for enterprise sales team",
    "New product launch announced for next quarter",
  ],
  news: [
    { title: "Company Announces Record Q4 Revenue", date: "2 days ago" },
    { title: "New Partnership with Major Bank", date: "1 week ago" },
    { title: "Executive Leadership Changes", date: "2 weeks ago" },
  ],
});

export const LandingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Try LYNQ demo state
  const [demoQuery, setDemoQuery] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResults, setDemoResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"company" | "contacts" | "insights">("company");

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

  const handleDemoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoQuery.trim()) return;
    
    setDemoLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setDemoResults(getDemoResults(demoQuery));
    setDemoLoading(false);
    setActiveTab("company");
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString("en-NG")}`;
  };

  const features = [
    {
      title: "Company Monitor",
      description: "Track target accounts with automatic updates on funding, hiring, and key events.",
      icon: <BuildingIcon />,
      color: "blue",
    },
    {
      title: "Contact Discovery",
      description: "Find decision makers with verified emails and LinkedIn profiles.",
      icon: <UsersIcon />,
      color: "green",
    },
    {
      title: "Industry Pulse",
      description: "Real-time news feed filtered to your industry and tracked companies.",
      icon: <NewspaperIcon />,
      color: "blue",
    },
    {
      title: "Smart Alerts",
      description: "Get notified when trigger events happen at your target accounts.",
      icon: <BellIcon />,
      color: "green",
    },
    {
      title: "Chrome Extension",
      description: "Add companies from LinkedIn or any website with one click.",
      icon: <GlobeIcon />,
      color: "blue",
    },
    {
      title: "Team Collaboration",
      description: "Share tracked companies and coordinate outreach with your team.",
      icon: <TeamIcon />,
      color: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-green-600 flex items-center justify-center shadow-lg shadow-blue-700/20">
              <SparklesIcon />
              <span className="sr-only">LYNQ</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              LYNQ
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#try-lynq" className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              Try it
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/auth/login")}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors px-4 py-2"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/auth/signup")}
              className="text-sm font-semibold text-white btn-gradient px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-700/20 hover:shadow-xl hover:shadow-blue-700/30"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="gradient-blob gradient-blob-blue w-96 h-96 -top-48 -right-48" />
        <div className="gradient-blob gradient-blob-green w-80 h-80 top-1/2 -left-40" />
        
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8 opacity-0 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            B2B Sales Intelligence Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-serif text-slate-900 mb-6 leading-[1.1] opacity-0 animate-fade-in-up animate-delay-100">
            Track Companies.
            <br />
            <span className="text-gradient">Close More Deals.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up animate-delay-200">
            The intelligence platform for sales teams. Monitor target accounts,
            discover contacts, and get real-time updates that help you reach out
            at the perfect moment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-300">
            <button
              onClick={() => navigate("/auth/signup")}
              className="w-full sm:w-auto font-semibold text-white btn-gradient px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-700/20 hover:shadow-xl hover:shadow-blue-700/30"
            >
              Start Free Trial
              <ArrowRightIcon />
            </button>
            <a
              href="#try-lynq"
              className="w-full sm:w-auto text-slate-700 hover:text-slate-900 border-2 border-slate-200 hover:border-slate-300 px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
            >
              <SearchIcon />
              Try it Now
            </a>
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
              <div className="text-2xl md:text-3xl font-serif text-slate-900 mb-1">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-slate-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Try LYNQ Section */}
      <section id="try-lynq" className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white bg-grid">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-medium mb-4">
              <SparklesIcon />
              Try it yourself
            </div>
            <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-4">
              See LYNQ in Action
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Enter any company name to see the kind of intelligence LYNQ provides. No signup required.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleDemoSearch} className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={demoQuery}
                  onChange={(e) => setDemoQuery(e.target.value)}
                  placeholder="Enter a company name (e.g., Stripe, Shopify, Slack)"
                  className="w-full px-5 py-4 pr-12 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </div>
              </div>
              <button
                type="submit"
                disabled={demoLoading || !demoQuery.trim()}
                className="px-8 py-4 btn-gradient text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-700/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {demoLoading ? <LoaderIcon /> : "Search"}
              </button>
            </div>
          </form>

          {/* Demo Results */}
          {demoResults && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden animate-fade-in-up">
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {[
                  { id: "company", label: "Company Info" },
                  { id: "contacts", label: "Decision Makers" },
                  { id: "insights", label: "AI Insights" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "text-blue-700 border-b-2 border-blue-700 bg-blue-50/50"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "company" && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center text-2xl font-bold text-blue-700">
                        {demoResults.company.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{demoResults.company.name}</h3>
                        <p className="text-slate-500">{demoResults.company.domain}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Industry", value: demoResults.company.industry },
                        { label: "HQ", value: demoResults.company.headquarters },
                        { label: "Employees", value: demoResults.company.employees },
                        { label: "Website", value: demoResults.company.domain },
                      ].map((item) => (
                        <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                          <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                          <div className="text-sm font-semibold text-slate-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-600">{demoResults.company.description}</p>
                    
                    {/* Recent News */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent News</h4>
                      <div className="space-y-2">
                        {demoResults.news.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-700">{item.title}</span>
                            <span className="text-xs text-slate-400">{item.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "contacts" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                      Key decision makers at {demoResults.company.name} that you can reach out to:
                    </p>
                    {demoResults.contacts.map((contact: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold">
                            {contact.name.split(" ").map((n: string) => n[0]).join("")}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{contact.name}</div>
                            <div className="text-sm text-slate-500">{contact.title}</div>
                          </div>
                        </div>
                        <div className="text-sm text-blue-600 font-medium blur-sm hover:blur-none transition-all cursor-pointer" title="Sign up to reveal">
                          {contact.email}
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-4">
                      <button
                        onClick={() => navigate("/auth/signup")}
                        className="text-sm font-medium text-blue-700 hover:text-blue-800"
                      >
                        Sign up to reveal all contacts →
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "insights" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                      AI-generated insights about {demoResults.company.name}:
                    </p>
                    {demoResults.insights.map((insight: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <SparklesIcon />
                        </div>
                        <p className="text-slate-700">{insight}</p>
                      </div>
                    ))}
                    <div className="text-center pt-4">
                      <button
                        onClick={() => navigate("/auth/signup")}
                        className="text-sm font-medium text-blue-700 hover:text-blue-800"
                      >
                        Get full AI analysis →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA after demo */}
          {demoResults && (
            <div className="text-center mt-8">
              <p className="text-slate-600 mb-4">
                Want to track {demoResults.company.name} and get real-time updates?
              </p>
              <button
                onClick={() => navigate("/auth/signup")}
                className="btn-gradient text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-blue-700/20 hover:shadow-xl"
              >
                Start Your Free Trial
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-4">
              Everything you need to win
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              A complete sales intelligence toolkit that keeps you informed and
              ahead of the competition.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl ${
                  feature.color === "blue" 
                    ? "bg-blue-50 text-blue-700 group-hover:bg-blue-100" 
                    : "bg-green-50 text-green-700 group-hover:bg-green-100"
                } flex items-center justify-center mb-4 transition-colors`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-50 bg-grid">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-600">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoaderIcon />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-2xl transition-all ${
                    plan.is_popular
                      ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-700/30 scale-105"
                      : "bg-white border border-slate-200 hover:border-blue-200 hover:shadow-lg"
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold text-blue-700 bg-white px-4 py-1.5 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className={`text-lg font-bold mb-1 ${plan.is_popular ? "text-white" : "text-slate-900"}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-serif ${plan.is_popular ? "text-white" : "text-slate-900"}`}>
                        {formatPrice(plan.price_monthly)}
                      </span>
                      <span className={`text-sm ${plan.is_popular ? "text-blue-200" : "text-slate-500"}`}>/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature: string) => (
                      <li
                        key={feature}
                        className={`flex items-start gap-3 text-sm ${plan.is_popular ? "text-blue-100" : "text-slate-600"}`}
                      >
                        <span className={`mt-0.5 ${plan.is_popular ? "text-green-400" : "text-green-600"}`}>
                          <CheckIcon />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("/auth/signup")}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                      plan.is_popular
                        ? "bg-white text-blue-700 hover:bg-blue-50"
                        : "btn-gradient text-white hover:shadow-lg"
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
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-4">
            Ready to close more deals?
          </h2>
          <p className="text-slate-600 mb-8">
            Join sales teams using LYNQ to stay ahead of the competition.
          </p>
          <button
            onClick={() => navigate("/auth/signup")}
            className="font-semibold text-white btn-gradient px-10 py-4 rounded-xl transition-all shadow-lg shadow-blue-700/20 hover:shadow-xl hover:shadow-blue-700/30"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-700 to-green-600 flex items-center justify-center">
              <SparklesIcon />
            </div>
            <span className="text-sm text-slate-500">
              © 2024 LYNQ. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
