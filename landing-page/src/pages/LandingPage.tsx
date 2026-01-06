import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiClient } from "../lib/api";

// Icon components
const SparklesIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const BuildingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const BellIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const ChartIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const GlobeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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

const PlayIcon = () => (
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

// Types for real API responses
interface CompanyResult {
  name: string;
  domain: string;
  industry?: string;
  headquarters?: string;
  employee_count?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  linkedin_url?: string;
}

interface ContactResult {
  full_name: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
}

interface DemoResults {
  company: CompanyResult;
  contacts: ContactResult[];
  insights: string[];
  news: { title: string; date: string }[];
  isReal: boolean;
}

export const LandingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Try LYNQ demo state
  const [demoQuery, setDemoQuery] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResults, setDemoResults] = useState<DemoResults | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
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
    setDemoError(null);
    setDemoResults(null);
    
    try {
      const searchResponse = await getApiClient().get("/public/search", {
        params: { query: demoQuery, limit: 5 },
        timeout: 30000,
      });
      
      const companies = searchResponse.data?.companies || searchResponse.data?.results || [];
      
      if (companies.length === 0) {
        setDemoError(`No companies found for "${demoQuery}". Try searching for well-known companies like "Stripe", "Shopify", or "Slack".`);
        setDemoLoading(false);
        return;
      }
      
      const company = companies[0];
      
      const insights: string[] = [];
      if (company.employee_count) {
        insights.push(`Company has approximately ${company.employee_count} employees`);
      }
      if (company.industry) {
        insights.push(`Operating in the ${company.industry} industry`);
      }
      if (company.headquarters) {
        insights.push(`Headquartered in ${company.headquarters}`);
      }
      if (company.description) {
        insights.push("Sign up to get AI-powered strategic insights and growth signals");
      }
      insights.push("🔒 Recent funding & valuation data (sign up to unlock)");
      insights.push("🔒 Hiring trends & growth indicators (sign up to unlock)");
      insights.push("🔒 Competitive positioning analysis (sign up to unlock)");
      
      const sampleContacts: ContactResult[] = [
        { full_name: "Executive Contact 1", title: "VP of Sales", email: "•••••@" + (company.domain || "company.com") },
        { full_name: "Executive Contact 2", title: "Head of Partnerships", email: "•••••@" + (company.domain || "company.com") },
        { full_name: "Executive Contact 3", title: "Director of Business Development", email: "•••••@" + (company.domain || "company.com") },
      ];
      
      const sampleNews = [
        { title: "🔒 Latest company news (sign up to unlock)", date: "Recent" },
        { title: "🔒 Industry updates & trends (sign up to unlock)", date: "This week" },
        { title: "🔒 Key events & announcements (sign up to unlock)", date: "This month" },
      ];
      
      setDemoResults({
        company: {
          name: company.name || company.company_name || demoQuery,
          domain: company.domain || "",
          industry: company.industry || "Technology",
          headquarters: company.headquarters || company.location || "",
          employee_count: company.employee_count || "",
          description: company.description || `${company.name} is a company in the ${company.industry || "technology"} sector.`,
          logo_url: company.logo_url,
          website: company.website || (company.domain ? `https://${company.domain}` : ""),
          linkedin_url: company.linkedin_url,
        },
        contacts: sampleContacts,
        insights,
        news: sampleNews,
        isReal: true,
      });
      setActiveTab("company");
    } catch (error: any) {
      console.error("Demo search error:", error);
      
      if (error.response?.status === 404) {
        setDemoError(`No results found for "${demoQuery}". Try a different company name.`);
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        setDemoError("Search is taking longer than expected. Please try again.");
      } else {
        setDemoError("Unable to search right now. Please try again in a moment.");
      }
    } finally {
      setDemoLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString("en-NG")}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-green-600 flex items-center justify-center shadow-lg shadow-blue-700/20">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              LYNQ
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              Features
            </a>
            <a href="#try-lynq" className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              Demo
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

      {/* Hero Section - Redesigned */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-40 -right-20 w-[400px] h-[400px] bg-gradient-radial from-green-100/30 via-transparent to-transparent rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100/50 text-blue-700 text-sm font-medium mb-8 opacity-0 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Trusted by 500+ Sales Teams
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-slate-900 mb-6 leading-[1.05] opacity-0 animate-fade-in-up animate-delay-100">
              Sales Intelligence
              <br />
              <span className="text-gradient">That Actually Works</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up animate-delay-200">
              Track target companies, discover decision makers, and get AI-powered insights that help you close more deals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-300">
              <button
                onClick={() => navigate("/auth/signup")}
                className="w-full sm:w-auto font-semibold text-white btn-gradient px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-700/25 hover:shadow-2xl hover:shadow-blue-700/30 hover:scale-[1.02]"
              >
                Start Free Trial
                <ArrowRightIcon />
              </button>
              <a
                href="#try-lynq"
                className="w-full sm:w-auto text-slate-700 hover:text-slate-900 bg-white border-2 border-slate-200 hover:border-slate-300 px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
              >
                <PlayIcon />
                Watch Demo
              </a>
            </div>
          </div>

          {/* Stats Row */}
          <div className="max-w-4xl mx-auto mt-20 grid grid-cols-4 gap-8 opacity-0 animate-fade-in-up animate-delay-400">
            {[
              { value: "10K+", label: "Companies" },
              { value: "50M+", label: "Contacts" },
              { value: "98%", label: "Accuracy" },
              { value: "<1s", label: "Updates" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-serif text-slate-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="py-24 px-6 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
              <SparklesIcon className="w-4 h-4" />
              Powerful Features
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-4">
              Everything you need to win
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              A complete sales intelligence toolkit designed for modern B2B teams
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* Large Feature Card - Spans 2 rows */}
            <div className="bento-card bento-card-featured md:row-span-2 p-8 flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30">
                <BuildingIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-serif text-slate-900 mb-3">
                Company Intelligence
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Track unlimited companies with automatic updates on funding rounds, leadership changes, product launches, and strategic moves. Never miss a sales opportunity again.
              </p>
              <div className="mt-auto">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      S
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">Stripe</div>
                      <div className="text-xs text-slate-500">Financial Technology</div>
                    </div>
                    <div className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      New Funding
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-xs text-slate-500">Employees</div>
                      <div className="font-semibold text-slate-900 text-sm">8,000+</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-xs text-slate-500">Valuation</div>
                      <div className="font-semibold text-slate-900 text-sm">$95B</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-xs text-slate-500">Signal</div>
                      <div className="font-semibold text-green-600 text-sm">Strong</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right Card */}
            <div className="bento-card bento-card-blue p-8 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-green-500/30">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-serif text-slate-900 mb-2">
                Contact Discovery
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Find decision makers with verified emails and LinkedIn profiles. AI-powered role matching ensures you reach the right people.
              </p>
              <div className="mt-auto flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['bg-blue-500', 'bg-green-500', 'bg-purple-500'].map((bg, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                      {['JD', 'KL', 'MN'][i]}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-slate-500 ml-2">50M+ contacts available</span>
              </div>
            </div>

            {/* Bottom Right Card */}
            <div className="bento-card bento-card-green p-8 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/30">
                <BellIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-serif text-slate-900 mb-2">
                Smart Alerts
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Get notified when trigger events happen at your target accounts. Perfect timing for outreach.
              </p>
              <div className="mt-auto">
                <div className="flex items-center gap-2 bg-white/80 rounded-xl px-3 py-2 border border-white">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-slate-700">3 new signals detected</span>
                </div>
              </div>
            </div>

            {/* Bottom Row - 3 smaller cards */}
            <div className="bento-card bento-shimmer p-6 flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-serif text-white mb-2">
                AI Insights
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Get actionable recommendations powered by AI analysis of company signals.
              </p>
            </div>

            <div className="bento-card p-6 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-400/30">
                <ChartIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-serif text-slate-900 mb-2">
                Analytics Dashboard
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track team performance and pipeline metrics with beautiful visualizations.
              </p>
            </div>

            <div className="bento-card p-6 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
                <GlobeIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-serif text-slate-900 mb-2">
                Chrome Extension
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Add companies from LinkedIn or any website with just one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Try LYNQ Section */}
      <section id="try-lynq" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-medium mb-4">
              <SparklesIcon className="w-4 h-4" />
              Interactive Demo
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-slate-900 mb-4">
              See LYNQ in Action
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Enter any company name to see the intelligence LYNQ provides. No signup required.
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
                  placeholder="Try: Stripe, Shopify, Zenith Bank..."
                  className="w-full px-6 py-4 pr-12 rounded-2xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg shadow-sm"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </div>
              </div>
              <button
                type="submit"
                disabled={demoLoading || !demoQuery.trim()}
                className="px-8 py-4 btn-gradient text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-700/20 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                {demoLoading ? <LoaderIcon /> : "Search"}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {demoError && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm animate-fade-in-up">
              {demoError}
            </div>
          )}

          {/* Demo Results */}
          {demoResults && (
            <div className="bento-card overflow-hidden animate-fade-in-up">
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {[
                  { id: "company", label: "Company Info", icon: <BuildingIcon className="w-4 h-4" /> },
                  { id: "contacts", label: "Decision Makers", icon: <UsersIcon className="w-4 h-4" /> },
                  { id: "insights", label: "AI Insights", icon: <SparklesIcon className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      activeTab === tab.id
                        ? "text-blue-700 border-b-2 border-blue-700 bg-blue-50/50"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {activeTab === "company" && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-5">
                      {demoResults.company.logo_url ? (
                        <img 
                          src={demoResults.company.logo_url} 
                          alt={demoResults.company.name}
                          className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg ${demoResults.company.logo_url ? 'hidden' : ''}`}>
                        {demoResults.company.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-serif text-slate-900">{demoResults.company.name}</h3>
                          {demoResults.isReal && (
                            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                              Live Data
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          {demoResults.company.domain && (
                            <a href={`https://${demoResults.company.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              {demoResults.company.domain} ↗
                            </a>
                          )}
                          {demoResults.company.linkedin_url && (
                            <a href={demoResults.company.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              LinkedIn ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Industry", value: demoResults.company.industry || "—" },
                        { label: "Headquarters", value: demoResults.company.headquarters || "—" },
                        { label: "Employees", value: demoResults.company.employee_count || "—" },
                        { label: "Website", value: demoResults.company.domain || "—" },
                      ].map((item) => (
                        <div key={item.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1 font-medium">{item.label}</div>
                          <div className="text-sm font-semibold text-slate-900 truncate">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {demoResults.company.description && (
                      <p className="text-slate-600 leading-relaxed">{demoResults.company.description}</p>
                    )}
                    
                    {/* Recent News */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Recent Updates</h4>
                      <div className="space-y-2">
                        {demoResults.news.map((item, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
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
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-slate-500">
                        Key decision makers at {demoResults.company.name}:
                      </p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                        3+ contacts available
                      </span>
                    </div>
                    {demoResults.contacts.map((contact, i: number) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {contact.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 blur-[3px] hover:blur-none transition-all cursor-pointer" title="Sign up to reveal">
                              {contact.full_name}
                            </div>
                            <div className="text-sm text-slate-500">{contact.title}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400 blur-[4px]" title="Sign up to reveal">
                            {contact.email}
                          </span>
                          <span className="text-xs">🔒</span>
                        </div>
                      </div>
                    ))}
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-5 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">Unlock all contacts</p>
                          <p className="text-sm text-slate-500">Get verified emails, LinkedIn profiles, and more</p>
                        </div>
                        <button
                          onClick={() => navigate("/auth/signup")}
                          className="px-5 py-2.5 text-sm font-semibold text-white btn-gradient rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          Sign Up Free
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "insights" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-slate-500">
                        AI-powered insights about {demoResults.company.name}:
                      </p>
                      <span className="text-xs bg-gradient-to-r from-blue-600 to-green-600 text-white px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                        <SparklesIcon className="w-3 h-3" /> AI Analysis
                      </span>
                    </div>
                    {demoResults.insights.map((insight: string, i: number) => {
                      const isLocked = insight.includes("🔒");
                      return (
                        <div 
                          key={i} 
                          className={`flex items-start gap-4 p-5 rounded-2xl border ${
                            isLocked 
                              ? "bg-slate-50 border-slate-200" 
                              : "bg-gradient-to-r from-blue-50 to-green-50 border-blue-100"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isLocked 
                              ? "bg-slate-200 text-slate-400" 
                              : "bg-gradient-to-br from-blue-600 to-green-600 text-white"
                          }`}>
                            {isLocked ? "🔒" : <SparklesIcon className="w-4 h-4" />}
                          </div>
                          <p className={`${isLocked ? "text-slate-500" : "text-slate-700"} leading-relaxed`}>{insight}</p>
                        </div>
                      );
                    })}
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-5 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">Unlock full AI analysis</p>
                          <p className="text-sm text-slate-500">Strategic insights, risk factors, and recommendations</p>
                        </div>
                        <button
                          onClick={() => navigate("/auth/signup")}
                          className="px-5 py-2.5 text-sm font-semibold text-white btn-gradient rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          Sign Up Free
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA after demo */}
          {demoResults && (
            <div className="text-center mt-10">
              <p className="text-slate-600 mb-4">
                Want to track {demoResults.company.name} and get real-time updates?
              </p>
              <button
                onClick={() => navigate("/auth/signup")}
                className="btn-gradient text-white font-semibold px-10 py-4 rounded-2xl shadow-xl shadow-blue-700/25 hover:shadow-2xl hover:scale-[1.02] transition-all"
              >
                Start Your Free Trial
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
              Pricing
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-slate-600">
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
                  className={`bento-card p-8 ${
                    plan.is_popular
                      ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white md:scale-105 shadow-xl shadow-blue-700/30"
                      : ""
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
                    <h3 className={`text-xl font-serif mb-2 ${plan.is_popular ? "text-white" : "text-slate-900"}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-serif ${plan.is_popular ? "text-white" : "text-slate-900"}`}>
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
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                      plan.is_popular
                        ? "bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
                        : "btn-gradient text-white hover:shadow-lg"
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm text-slate-500 mt-10">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bento-card bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 md:p-16 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">
                Ready to close more deals?
              </h2>
              <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">
                Join 500+ sales teams using LYNQ to stay ahead of the competition.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate("/auth/signup")}
                  className="font-semibold text-slate-900 bg-white hover:bg-slate-100 px-10 py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center gap-2"
                >
                  Start Your Free Trial
                  <ArrowRightIcon />
                </button>
                <a
                  href="#try-lynq"
                  className="text-slate-300 hover:text-white transition-colors font-medium"
                >
                  or try the demo first
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-700 to-green-600 flex items-center justify-center shadow-md">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-500">
              © 2024 LYNQ. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-8">
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
