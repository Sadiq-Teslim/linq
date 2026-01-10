import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiClient } from "../lib/api";

// Icons
const RadarIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
    <path d="M4 6h.01" />
    <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" />
    <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" />
    <path d="M12 18h.01" />
    <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" />
    <circle cx="12" cy="12" r="2" />
    <path d="m13.41 10.59 5.66-5.66" />
  </svg>
);

const BuildingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);

const UsersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BellRingIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    <path d="M4 2C2.8 3.7 2 5.7 2 8" />
    <path d="M22 8c0-2.3-.8-4.3-2-6" />
  </svg>
);

const SparklesIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const BarChartIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="14" />
  </svg>
);

const ChromeIcon = () => (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="21.17" x2="12" y1="8" y2="8" />
    <line x1="3.95" x2="8.54" y1="6.06" y2="14" />
    <line x1="10.88" x2="15.46" y1="21.94" y2="14" />
  </svg>
);

const PlayCircleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const TrendingUpIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const LockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const WandIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8 19 13" />
    <path d="M15 9h0" />
    <path d="M17.8 6.2 19 5" />
    <path d="m3 21 9-9" />
    <path d="M12.2 6.2 11 5" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    <path d="M6 18a4 4 0 0 1-1.967-.516" />
    <path d="M19.967 17.484A4 4 0 0 1 18 18" />
  </svg>
);

// Types
interface DemoCompany {
  name: string;
  location: string;
  website: string;
  employees: string;
  revenue: string;
  industry: string;
  description: string;
}

interface DemoContact {
  initials: string;
  name: string;
  title: string;
  revealed: boolean;
}

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [demoCompany, setDemoCompany] = useState<DemoCompany | null>(null);
  // const revealRefs = useRef<(HTMLDivElement | null)[]>([]); 

  // Reveal animation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const reveals = document.querySelectorAll('.reveal');
      reveals.forEach((reveal) => {
        const windowHeight = window.innerHeight;
        const elementTop = reveal.getBoundingClientRect().top;
        const elementVisible = 100;
        
        if (elementTop < windowHeight - elementVisible) {
          reveal.classList.add('active');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger on load
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Demo search handler
  const handleDemoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      const response = await getApiClient().get("/public/search", {
        params: { query: searchQuery, limit: 1 },
        timeout: 15000,
      });
      
      const companies = response.data?.companies || [];
      
      if (companies.length > 0) {
        const c = companies[0];
        setDemoCompany({
          name: c.name || searchQuery,
          location: c.headquarters || "San Francisco, CA",
          website: c.domain || "company.com",
          employees: c.employee_count || "500+",
          revenue: "$50M+",
          industry: c.industry || "Technology",
          description: c.description || `${c.name || searchQuery} is an innovative company in the ${c.industry || "technology"} sector, providing cutting-edge solutions.`,
        });
      } else {
        // Fallback demo data
        setDemoCompany({
          name: searchQuery,
          location: "San Francisco, CA",
          website: `${searchQuery.toLowerCase().replace(/\s+/g, '')}.com`,
          employees: "1,200+",
          revenue: "$150M",
          industry: "SaaS",
          description: `${searchQuery} is a leading provider of enterprise solutions. They recently raised Series C funding and are actively expanding their team.`,
        });
      }
    } catch (error) {
      // Fallback demo data
      setDemoCompany({
        name: searchQuery || "Acme Corporation",
        location: "San Francisco, CA",
        website: "acmecorp.com",
        employees: "1,200+",
        revenue: "$150M",
        industry: "SaaS",
        description: `${searchQuery || "Acme Corp"} is a leading provider of cloud infrastructure solutions. They recently raised Series C funding and are actively expanding their sales engineering team.`,
      });
    } finally {
      setIsSearching(false);
      setActiveTab(0);
    }
  };

  const demoContacts: DemoContact[] = [
    { initials: "JD", name: "Jane Doe", title: "VP of Sales", revealed: true },
    { initials: "MS", name: "Mark Smith", title: "CTO", revealed: false },
    { initials: "AL", name: "Amy Lee", title: "Head of Ops", revealed: false },
  ];

  return (
    <div className="relative min-h-screen bg-white">
      {/* 1. Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group relative z-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all duration-300">
              <RadarIcon />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">LYNQ</span>
          </a>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 relative z-10">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors relative group">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-green-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors relative group">
              Demo
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-green-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors relative group">
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-green-600 group-hover:w-full transition-all duration-300"></span>
            </a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6 relative z-10">
            <button onClick={() => navigate("/auth/login")} className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block transition-colors">
              Log In
            </button>
            <button
              onClick={() => navigate("/auth/signup")}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg hover:shadow-blue-500/30"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden bg-white">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide mb-8 border border-blue-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Trusted by 500+ Sales Teams
          </div>

          {/* Headline */}
          <h1 className="reveal text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight text-slate-900 mb-6 font-serif" style={{ transitionDelay: '100ms' }}>
            Turn Cold Leads into <br />
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent italic pr-2">Closed Deals</span>
          </h1>

          {/* Subheadline */}
          <p className="reveal text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ transitionDelay: '200ms' }}>
            LYNQ uses advanced AI to uncover high-intent buyers, verified contact data, and actionable insights so you can sell smarter, not harder.
          </p>

          {/* CTAs */}
          <div className="reveal flex flex-col sm:flex-row items-center justify-center gap-4 mb-16" style={{ transitionDelay: '300ms' }}>
            <button
              onClick={() => navigate("/auth/signup")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
            >
              Start Free Trial
            </button>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2 group shadow-sm"
            >
              <PlayCircleIcon />
              <span className="group-hover:translate-x-1 transition-transform">View Demo</span>
            </a>
          </div>

          {/* Stats */}
          <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pt-8 border-t border-slate-200" style={{ transitionDelay: '400ms' }}>
            {[
              { value: "95M+", label: "Companies" },
              { value: "750M+", label: "Contacts" },
              { value: "98%", label: "Data Accuracy" },
              { value: "2x", label: "Faster Pipeline" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent font-serif mb-1">{stat.value}</div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Features Section (Bento Grid) */}
      <section id="features" className="py-24 px-6 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal relative z-10">
            <h2 className="text-3xl md:text-4xl text-slate-900 mb-4 tracking-tight font-serif">Everything you need to grow</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">Powerful tools designed to help your sales team identify, connect, and close opportunities faster.</p>
          </div>

          <div className="bento-grid reveal" style={{ transitionDelay: '200ms' }}>
            {/* 1. Large Card: Company Intelligence */}
            <div className="bento-large group relative bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden transition-all duration-500 card-hover shadow-lg hover:shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-green-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform duration-500 blur-xl" />
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white group-hover:scale-110 transition-all duration-300 shadow-lg">
                  <BuildingIcon />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3 tracking-tight font-serif relative z-10">Company Intelligence</h3>
              <p className="text-slate-600 leading-relaxed mb-8 max-w-md relative z-10">Gain deep visibility into millions of companies. Track funding rounds, leadership changes, tech stacks, and intent signals in real-time.</p>
              
              {/* Mockup inside card */}
              <div className="relative w-full h-64 bg-slate-50 rounded-xl border border-slate-200 p-4 group-hover:translate-y-[-10px] transition-transform duration-500 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded bg-indigo-600" />
                  <div>
                    <div className="h-2 w-24 bg-slate-200 rounded mb-1" />
                    <div className="h-1.5 w-16 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-100 rounded" />
                  <div className="h-2 w-5/6 bg-slate-100 rounded" />
                  <div className="h-2 w-4/6 bg-slate-100 rounded" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="h-16 bg-white rounded border border-slate-100 p-2">
                    <div className="h-1.5 w-8 bg-green-100 rounded mb-2" />
                    <div className="h-4 w-12 bg-slate-100 rounded" />
                  </div>
                  <div className="h-16 bg-white rounded border border-slate-100 p-2">
                    <div className="h-1.5 w-8 bg-blue-100 rounded mb-2" />
                    <div className="h-4 w-12 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Medium Card: Contact Discovery */}
            <div className="group bg-white border border-slate-200 rounded-3xl p-8 card-hover transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-all duration-300 shadow-lg">
                <UsersIcon />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2 font-serif">Contact Discovery</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Access verified emails and direct dials for decision makers. 98% deliverability guarantee.</p>
            </div>

            {/* 3. Medium Card: Smart Alerts */}
            <div className="group bg-white border border-slate-200 rounded-3xl p-8 card-hover transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-all duration-300 shadow-lg">
                <BellRingIcon />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2 font-serif">Smart Alerts</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Be the first to know when a prospect hires, raises funds, or changes tech providers.</p>
            </div>

            {/* 4. Small Card: AI Insights */}
            <div className="group bg-white border border-slate-200 rounded-3xl p-6 card-hover transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-all duration-300">
                <SparklesIcon />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1 font-serif">AI Insights</h3>
              <p className="text-slate-600 text-xs">Automated outreach suggestions based on buying signals.</p>
            </div>

            {/* 5. Small Card: Analytics */}
            <div className="group bg-white border border-slate-200 rounded-3xl p-6 card-hover transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-all duration-300">
                <BarChartIcon />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1 font-serif">Analytics</h3>
              <p className="text-slate-600 text-xs">Measure team performance and data usage in real-time.</p>
            </div>

            {/* 6. Small Card: Chrome Extension */}
            <div className="group bg-white border border-slate-200 rounded-3xl p-6 card-hover transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-all duration-300">
                <ChromeIcon />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1 font-serif">Extension</h3>
              <p className="text-slate-600 text-xs">Reveal contact info instantly on LinkedIn and company sites.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Demo Section */}
      <section id="demo" className="py-20 px-6 relative bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 reveal relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-100">
              <WandIcon />
              Live Preview
            </div>
            <h2 className="text-3xl md:text-4xl text-slate-900 tracking-tight font-serif">Experience the power of LYNQ</h2>
          </div>

          {/* Interactive Component */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden reveal relative z-10 shadow-xl">
            {/* Search Header */}
            <form onSubmit={handleDemoSearch} className="p-6 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any company (e.g. Stripe, Acme Corp)"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/30"
              >
                {isSearching ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    Analyze
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </form>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {[
                { icon: <BuildingIcon />, label: "Company Info" },
                { icon: <UsersIcon />, label: "Decision Makers" },
                { icon: <BrainIcon />, label: "AI Insights" },
              ].map((tab, index) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(index)}
                  className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === index
                      ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-8 min-h-[300px] relative bg-white">
              {/* Content 1: Company Info */}
              {activeTab === 0 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {(demoCompany?.name || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{demoCompany?.name || "Acme Corporation"}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 flex-wrap">
                        <MapPinIcon />
                        <span>{demoCompany?.location || "San Francisco, CA"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        <GlobeIcon />
                        <span>{demoCompany?.website || "acmecorp.com"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Employees</div>
                      <div className="font-semibold text-slate-900">{demoCompany?.employees || "1,200+"}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Revenue</div>
                      <div className="font-semibold text-slate-900">{demoCompany?.revenue || "$150M"}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Industry</div>
                      <div className="font-semibold text-slate-900">{demoCompany?.industry || "SaaS"}</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {demoCompany?.description || "Acme Corp is a leading provider of cloud infrastructure solutions. They recently raised Series C funding and are actively expanding their sales engineering team."}
                  </p>
                </div>
              )}

              {/* Content 2: Decision Makers */}
              {activeTab === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  {demoContacts.map((contact, i) => (
                    <div key={i} className={`relative ${!contact.revealed ? 'group cursor-pointer' : ''}`}>
                      {!contact.revealed && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                          <span className="bg-white border border-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium shadow-lg">Unlock to see details</span>
                        </div>
                      )}
                      <div className={`flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500/50 transition-colors ${!contact.revealed ? 'blur-[3px] select-none' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${contact.revealed ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {contact.initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{contact.name}</div>
                            <div className="text-xs text-slate-600">{contact.title}</div>
                          </div>
                        </div>
                        <button className="text-xs font-medium text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                          {contact.revealed ? 'View' : 'Reveal'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Content 3: AI Insights */}
              {activeTab === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <TrendingUpIcon className="text-blue-600 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900">High Growth Signal</h5>
                      <p className="text-xs text-slate-600 mt-1">Company increased headcount by 15% in the last quarter, specifically in engineering roles.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60">
                    <LockIcon className="text-slate-400 flex-shrink-0" />
                    <div className="blur-[4px] select-none">
                      <h5 className="text-sm font-semibold text-slate-900">Technology Stack Change</h5>
                      <p className="text-xs text-slate-600 mt-1">Recently dropped Salesforce and is currently evaluating CRM alternatives.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60">
                    <LockIcon className="text-slate-400 flex-shrink-0" />
                    <div className="blur-[4px] select-none">
                      <h5 className="text-sm font-semibold text-slate-900">Buying Intent Detected</h5>
                      <p className="text-xs text-slate-600 mt-1">Multiple team members viewed competitor pricing pages.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom CTA Banner in Demo */}
            <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Want to see real data?</p>
              <button
                onClick={() => navigate("/auth/signup")}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group transition-colors"
              >
                Sign up for free
                <span className="group-hover:translate-x-1 transition-transform">
                  <ArrowRightIcon />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal relative z-10">
            <h2 className="text-3xl md:text-4xl text-slate-900 mb-4 tracking-tight font-serif">Simple, transparent pricing</h2>
            <p className="text-slate-600 text-lg">Choose the plan that fits your sales team.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
            {/* Starter */}
            <div className="reveal bg-white border border-slate-200 p-8 rounded-3xl card-hover transition-all relative z-10 shadow-lg hover:shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2 font-serif">Starter</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">$49</span>
                <span className="text-slate-600">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                {["1,000 Credits/mo", "Basic Search", "Chrome Extension"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth/signup")}
                className="w-full py-3 rounded-xl bg-white border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                Get Starter
              </button>
            </div>

            {/* Professional */}
            <div className="reveal relative bg-white border-2 border-blue-500 p-8 rounded-3xl md:scale-110 z-10 card-hover shadow-xl" style={{ transitionDelay: '150ms' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-full text-white text-xs font-bold uppercase tracking-wide shadow-lg">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 font-serif">Professional</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">$99</span>
                <span className="text-slate-600">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                {["5,000 Credits/mo", "Advanced Filtering", "Intent Signals", "CRM Integration"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth/signup")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="reveal bg-white border border-slate-200 p-8 rounded-3xl card-hover transition-all relative z-10 shadow-lg hover:shadow-xl" style={{ transitionDelay: '300ms' }}>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 font-serif">Enterprise</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Custom</span>
              </div>
              <ul className="space-y-4 mb-8">
                {["Unlimited Credits", "API Access", "Dedicated Manager"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-white border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                Contact Sales
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-600 mt-12 relative z-10">14-day free trial on all plans. No credit card required.</p>
        </div>
      </section>

      {/* 6. Final CTA Section */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal relative rounded-[2.5rem] bg-white border border-slate-200 overflow-hidden px-6 py-20 text-center shadow-xl">
            {/* Decorative Blur Circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-100 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-serif text-slate-900 mb-6 tracking-tight">Ready to supercharge your sales?</h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-10">Join thousands of sales professionals finding their next big deal with LYNQ.</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate("/auth/signup")}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold text-lg transition-all hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Get Started for Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white shadow-lg">
              <RadarIcon />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">LYNQ</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-600">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Support</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center md:text-left text-xs text-slate-500">
          © 2024 LYNQ Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
