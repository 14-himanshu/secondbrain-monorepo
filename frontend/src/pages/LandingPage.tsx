import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Logo } from "../icons/Logo";
import { 
  Bot, 
  Search, 
  Shield, 
  Activity, 
  ChevronRight, 
  FileText, 
  Globe, 
  Database,
  Sparkles,
  Lock,
  Zap,
  Menu,
  X,
  Check,
  Star,
  Moon,
  Sun
} from "lucide-react";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { useTheme } from "../contexts/ThemeContext";


function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border bg-card transition-all duration-200 cursor-pointer ${
        open ? "border-primary/40 shadow-[0_0_20px_rgba(111,99,217,0.1)]" : "border-border/50 hover:border-primary/30"
      }`}
      onClick={() => setOpen((v) => !v)}
    >
      <button className="w-full flex items-center justify-between p-5 text-left gap-4" aria-expanded={open}>
        <h3 className="text-base font-bold leading-snug">{q}</h3>
        {/* Inline chevron SVG — no lucide dependency */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180 text-primary" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "max-h-48" : "max-h-0"
        }`}
      >
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // height of fixed header + some padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="animate-page-enter min-h-screen bg-background text-foreground font-sans selection:bg-purple-500/30">
      
      {/* 1. Navigation Bar */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md flex items-center justify-center text-white border border-purple-400/30">
              <Logo />
            </div>
            <span className="text-xl font-bold tracking-tight">SecondBrain</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#product-tour" onClick={(e) => scrollToSection(e, 'product-tour')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Platform
            </a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Security
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-5">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-150 flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link
              to="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="btn-cta-glow inline-flex h-9 items-center justify-center rounded-xl font-bold tracking-tight px-5 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Get Started
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-foreground p-2 rounded-lg hover:bg-muted/50 transition-all duration-150">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border/40 p-4 flex flex-col gap-4 md:hidden shadow-xl animate-in slide-in-from-top-2">
            <a href="#product-tour" onClick={(e) => scrollToSection(e, 'product-tour')} className="p-2 text-sm font-medium text-foreground">Platform</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="p-2 text-sm font-medium text-foreground">Features</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="p-2 text-sm font-medium text-foreground">Pricing</a>
            <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="p-2 text-sm font-medium text-foreground">Security</a>
            <div className="border-t border-border/40 my-1"></div>
            <button
              onClick={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark');
                setIsMobileMenuOpen(false);
              }}
              className="p-2 text-sm font-medium text-foreground flex items-center gap-3 w-full text-left"
            >
              {theme === 'dark' ? (
                <><Sun className="w-5 h-5" /> Light Mode</>
              ) : (
                <><Moon className="w-5 h-5" /> Dark Mode</>
              )}
            </button>
            <div className="h-px w-full bg-border/50 my-2" />
            <Link to="/login" className="p-2 text-sm font-semibold text-foreground">Sign In</Link>
            <Link to="/signup" className="flex items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-[0_4px_12px_rgba(109,99,255,0.2)]">Get Started</Link>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center w-full">
        
        {/* 2. Hero Section */}
        <section className="relative w-full overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center">
          {/* Subtle glow background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
          
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
            
            <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-8 backdrop-blur-sm">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Intelligence Amplified
            </div>
            
            <h1 className="mx-auto max-w-5xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
              Defeat Information <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500">Fragmentation.</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-xl text-lg sm:text-xl text-muted-foreground leading-relaxed font-medium">
              Stop losing ideas. Second Brain captures, summarizes, and connects everything you read, watch, and discover — so you never forget again.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Link
                to="/signup"
                className="btn-cta-glow inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl font-bold tracking-tight px-8 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Start Capturing for Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </div>

            {/* Visual: App Mockup */}
            <div className="mx-auto mt-20 w-full max-w-5xl relative group perspective-[2000px]">
              <div className="absolute -inset-1 bg-gradient-to-b from-purple-500/20 to-transparent rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition duration-1000"></div>
              <div className="relative rounded-2xl border border-border/50 dark:border-slate-800 bg-background/40 dark:bg-[#09090b]/80 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col ring-1 ring-white/10 transition-transform duration-700 hover:rotate-x-2">
                
                {/* Window Controls */}
                <div className="flex h-12 items-center border-b border-border/50 dark:border-slate-800/80 px-4 gap-2 bg-muted/20 dark:bg-black/20">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-sm" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80 shadow-sm" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80 shadow-sm" />
                  </div>
                  <div className="mx-auto w-1/2 max-w-sm rounded-md bg-background/50 dark:bg-white/5 py-1.5 text-center text-xs font-medium text-muted-foreground border border-border/30 dark:border-white/5 shadow-sm backdrop-blur-md flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3 opacity-70" />
                    secondbrain.app
                  </div>
                </div>

                {/* Dashboard Fake Body */}
                <div className="flex h-[450px] w-full">
                  {/* Fake Sidebar */}
                  <div className="hidden w-56 border-r border-border/50 dark:border-slate-800/80 bg-muted/10 dark:bg-white/[0.02] p-5 sm:flex flex-col gap-4">
                    <div className="h-8 w-full rounded-lg bg-primary/10 border border-primary/20 flex items-center px-3 gap-3 text-primary font-semibold text-sm">
                      <Database className="w-4 h-4" />
                      <span>My Vault</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-sm text-foreground font-medium transition-colors">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span>All Items</span>
                      </div>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-sm text-muted-foreground font-medium transition-colors">
                        <FileText className="w-4 h-4" />
                        <span>Documents</span>
                      </div>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-sm text-muted-foreground font-medium transition-colors">
                        <YouTubeIcon />
                        <span>Videos</span>
                      </div>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-sm text-muted-foreground font-medium transition-colors">
                        <TwitterIcon />
                        <span>Tweets</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fake Content Area — theme-aware dot grid */}
                  <div className="flex-1 p-6 flex flex-col gap-6 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-90">
                    {/* Fake Header/Search */}
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-1/3 min-w-[200px] rounded-lg bg-card border shadow-sm dark:bg-white/5 dark:border-white/10 flex items-center px-3 text-muted-foreground text-xs">
                        <Search className="w-3.5 h-3.5 mr-2 opacity-50" />
                        Search semantic web...
                      </div>
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    
                    {/* Fake Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Card 1 */}
                      <div className="h-32 rounded-xl bg-card dark:bg-[#111113]/90 border border-border/50 dark:border-white/10 shadow-sm p-4 flex flex-col gap-3 backdrop-blur-md hover:border-primary/50 transition-colors">
                        <div className="flex gap-3 items-center">
                          <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-sm truncate text-foreground">Systemic Design Principles</div>
                        </div>
                        <div className="mt-auto text-xs text-muted-foreground line-clamp-2">
                          A comprehensive guide to applying systems thinking in product design architecture.
                        </div>
                      </div>
                      
                      {/* Card 2 */}
                      <div className="h-32 rounded-xl bg-card dark:bg-[#111113]/90 border border-border/50 dark:border-white/10 shadow-sm p-4 flex flex-col gap-3 backdrop-blur-md hover:border-primary/50 transition-colors">
                        <div className="flex gap-3 items-center">
                          <div className="w-7 h-7 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                            <YouTubeIcon />
                          </div>
                          <div className="font-semibold text-sm truncate text-foreground">React 19 Deep Dive</div>
                        </div>
                        <div className="mt-auto text-xs text-muted-foreground line-clamp-2">
                          Detailed walkthrough of the new compiler and concurrent features released this year.
                        </div>
                      </div>
                      
                      {/* Card 3 */}
                      <div className="h-32 rounded-xl bg-card dark:bg-[#111113]/90 border border-border/50 dark:border-white/10 shadow-sm p-4 flex flex-col gap-3 backdrop-blur-md hover:border-primary/50 transition-colors">
                        <div className="flex gap-3 items-center">
                          <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <TwitterIcon />
                          </div>
                          <div className="font-semibold text-sm truncate text-foreground">Tailwind v4 Patterns</div>
                        </div>
                        <div className="mt-auto text-xs text-muted-foreground line-clamp-2">
                          A thread on migrating to the new CSS utility engine and optimizing your builds.
                        </div>
                      </div>
                      
                      {/* Card 4 */}
                      <div className="h-32 rounded-xl bg-card dark:bg-[#111113]/90 border border-border/50 dark:border-white/10 shadow-sm p-4 flex flex-col gap-3 backdrop-blur-md hover:border-primary/50 transition-colors">
                        <div className="flex gap-3 items-center">
                          <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-sm truncate text-foreground">State of AI 2026</div>
                        </div>
                        <div className="mt-auto text-xs text-muted-foreground line-clamp-2">
                          The evolution of autonomous agents, semantic models, and reasoning engines.
                        </div>
                      </div>

                      {/* Card 5 */}
                      <div className="h-32 rounded-xl bg-card dark:bg-[#111113]/90 border border-border/50 dark:border-white/10 shadow-sm p-4 flex flex-col gap-3 backdrop-blur-md hover:border-primary/50 transition-colors md:hidden lg:flex">
                        <div className="flex gap-3 items-center">
                          <div className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Database className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-sm truncate text-foreground">RAG Architecture Setup</div>
                        </div>
                        <div className="mt-auto text-xs text-muted-foreground line-clamp-2">
                          Vector embeddings, chunking strategies, and retrieval logic for personal vaults.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 3. Integration & Trust Bar */}
        <section className="w-full border-y border-border/40 bg-muted/20 dark:bg-white/[0.01] py-10">
          <div className="container mx-auto max-w-7xl px-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">Seamlessly aggregate knowledge from</p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 font-bold text-lg"><YouTubeIcon /> YouTube</div>
              <div className="flex items-center gap-2 font-bold text-lg"><TwitterIcon /> Twitter/X</div>
              <div className="flex items-center gap-2 font-bold text-lg"><FileText className="w-6 h-6" /> PDFs</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Globe className="w-6 h-6" /> Articles</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Database className="w-6 h-6" /> Notion</div>
            </div>
          </div>
        </section>

        {/* 4. Zig-Zag Product Tour */}
        <section id="product-tour" className="w-full py-24 lg:py-32 overflow-hidden relative">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-24 lg:space-y-32">
            
            {/* Row 1 */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                  <Database className="mr-2 h-4 w-4" />
                  Universal Capture
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Resilient Multi-Source Ingestion.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Experience zero-friction, automated parsing of web pages, deep articles, and video transcripts. Engineered to bypass scraper blockades and extract the pure signal from the noise, formatting everything perfectly into your vault.
                </p>
                <ul className="space-y-3 pt-4">
                  {[
                    "Auto-extracts full text & metadata",
                    "Transcribes YouTube videos automatically",
                    "Bypasses anti-bot walls for clean reads"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-medium text-foreground">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary">
                        <ChevronRight className="w-3 h-3" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 rounded-3xl blur-2xl -z-10" />
                <div className="relative rounded-2xl border border-border/50 dark:border-white/10 bg-card/50 dark:bg-[#111113]/80 p-6 shadow-2xl backdrop-blur-sm">
                  {/* Abstract Representation of Parsing */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 bg-background dark:bg-white/5 border border-border/50 p-4 rounded-xl">
                      <Globe className="w-8 h-8 text-blue-500 shrink-0" />
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        <span className="text-sm font-semibold truncate text-foreground">https://paulgraham.com/greatwork.html</span>
                        <span className="text-xs text-muted-foreground truncate">Parsing raw HTML and removing boilerplate...</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-0.5 h-6 bg-border" />
                    </div>
                    <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 p-4 rounded-xl ring-1 ring-primary/20">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        <span className="text-sm font-semibold text-primary truncate">Knowledge Extracted</span>
                        <span className="text-xs text-primary/70 truncate">Title, Summary, and Vector Embeddings generated.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-3xl blur-2xl -z-10" />
                <div className="relative rounded-2xl border border-border/50 dark:border-white/10 bg-card/50 dark:bg-[#111113]/80 p-6 shadow-2xl backdrop-blur-sm h-[320px] flex flex-col">
                  {/* Abstract Chat UI */}
                  <div className="flex-1 overflow-hidden space-y-6 py-2">
                    <div className="flex gap-4 max-w-[80%]">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-bold">U</div>
                      <div className="bg-background dark:bg-white/5 border border-border/50 rounded-2xl rounded-tl-sm p-4 text-sm text-foreground">
                        What were the key takeaways from that systemic design article?
                      </div>
                    </div>
                    <div className="flex gap-4 max-w-[90%]">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl rounded-tl-sm p-4 text-sm text-foreground space-y-3">
                        <p>Based on your saved article <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs font-semibold cursor-pointer hover:underline"><FileText className="w-3 h-3"/> Systemic Design Principles</span>, the key takeaways are:</p>
                        <div className="space-y-1.5 pl-2 border-l-2 border-primary/30 text-muted-foreground">
                          <div className="h-2 w-full rounded bg-muted-foreground/20" />
                          <div className="h-2 w-4/5 rounded bg-muted-foreground/20" />
                          <div className="h-2 w-5/6 rounded bg-muted-foreground/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2 space-y-6">
                <div className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  <Bot className="mr-2 h-4 w-4" />
                  Neural Retrieval
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Context-Grounded AI Assistant.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Chat with your entire knowledge base. Our descriptive RAG (Retrieval-Augmented Generation) pipeline answers complex queries using only your stored content, completely eliminating AI hallucinations.
                </p>
                <ul className="space-y-3 pt-4">
                  {[
                    "100% grounded in your personal data",
                    "Inline cited source badges for verification",
                    "Cross-pollinate ideas across different documents"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-medium text-foreground">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500">
                        <ChevronRight className="w-3 h-3" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* 5. Bento Box Features Grid */}
        <section id="features" className="w-full py-24 lg:py-32 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 lg:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Enterprise-grade architecture.</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Built from the ground up for speed, security, and scalability. Everything you need to manage a massive personal ontology.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 auto-rows-[280px]">
              
              {/* Feature 1 - Spans 2 cols on lg */}
              <div className="lg:col-span-2 group relative overflow-hidden rounded-3xl border border-border/50 dark:border-white/10 bg-card dark:bg-[#111113] p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight mb-3">Semantic Vector Search</h3>
                  <p className="text-muted-foreground max-w-md leading-relaxed">
                    Find stored memories instantly using natural language. We encode everything into high-dimensional embeddings, so you can search by concept, not just keywords.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-3xl border border-border/50 dark:border-white/10 bg-card dark:bg-[#111113] p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mb-3">Automated AI Summaries</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Extract key ideas, themes, and difficulty tags automatically upon ingestion. Digest long articles in seconds.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div id="security" className="group relative overflow-hidden rounded-3xl border border-border/50 dark:border-white/10 bg-card dark:bg-[#111113] p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mb-3">Dynamic Privacy Panel</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Manage custom profiles, security policies, and granular AI preferences. Your data remains strictly isolated.
                  </p>
                </div>
              </div>

              {/* Feature 4 - Spans 2 cols on md/lg */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border/50 dark:border-white/10 bg-card dark:bg-[#111113] p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight mb-3">Seamless Quota Management</h3>
                  <p className="text-muted-foreground max-w-md leading-relaxed">
                    Track your manual neural extractions and system usage in real-time. Upgrade seamlessly when you need unlimited power for massive research tasks.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 6. Testimonials Section */}
        <section id="testimonials" className="w-full py-24 lg:py-32 bg-muted/30 dark:bg-white/[0.02]">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 lg:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Loved by researchers & devs.</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Don't just take our word for it. Here's what our early adopters have to say.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: "Sarah J.", role: "AI Researcher", text: "Second Brain completely changed how I manage my literature reviews. The semantic search feels like magic." },
                { name: "David M.", role: "Senior Engineer", text: "Finally, a tool that can parse long technical YouTube videos into digestible, searchable notes. Incredible work." },
                { name: "Elena R.", role: "Product Manager", text: "The RAG chat is phenomenal. It never hallucinates because it only uses the context I explicitly saved." }
              ].map((t, i) => (
                <div key={i} className="rounded-3xl border border-border/50 dark:border-white/10 bg-card p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex gap-1 text-yellow-500">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-sm font-medium leading-relaxed flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 flex items-center justify-center font-bold text-primary">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Pricing Section */}
        <section id="pricing" className="w-full py-24 lg:py-32 relative border-y border-border/40 bg-muted/10 dark:bg-black/20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
          
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 lg:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Simple, transparent pricing.</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Start capturing for free, upgrade when you need massive scale and AI chat.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <div className="relative rounded-3xl border border-border/50 dark:border-white/10 bg-card/50 dark:bg-[#111113]/80 p-8 shadow-sm backdrop-blur-md flex flex-col h-full hover:scale-[1.01] hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-default">
                <h3 className="text-2xl font-bold tracking-tight mb-2">Hobby</h3>
                <p className="text-muted-foreground text-sm mb-6">Perfect for personal knowledge management.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black">$0</span>
                  <span className="text-muted-foreground"> / forever</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {[
                    "Up to 1,000 saved nodes",
                    "Basic semantic search",
                    "Web & Article extraction",
                    "Community support"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="flex h-12 items-center justify-center rounded-xl font-bold border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground">
                  Get Started Free
                </Link>
              </div>

              {/* Pro Tier */}
              <div className="relative rounded-3xl border border-primary/50 bg-card p-8 shadow-[0_8px_40px_-12px_rgba(109,99,255,0.3)] flex flex-col h-full hover:scale-[1.01] hover:shadow-[0_12px_48px_-8px_rgba(109,99,255,0.45)] transition-all duration-200 cursor-default">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-md">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-2">Pro</h3>
                <p className="text-muted-foreground text-sm mb-6">For power users, researchers, and developers.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black">$12</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {[
                    "Unlimited saved nodes",
                    "Advanced RAG AI Chat",
                    "YouTube & PDF extraction",
                    "API Access",
                    "Priority support"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="flex h-12 items-center justify-center rounded-xl font-bold bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(109,99,255,0.25)] transition-all hover:bg-primary/90 hover:scale-[1.02]">
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 8. FAQ Section */}
        <section id="faq" className="w-full py-24 lg:py-32">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-3">
              {[
                { q: "How is my data stored and secured?", a: "Your data is strictly encrypted at rest and in transit. We use isolated vector environments ensuring your private semantic web is never co-mingled with others." },
                { q: "Can I export my nodes if I leave?", a: "Absolutely. We offer 1-click bulk exports in JSON and Markdown formats. Your data is yours, forever." },
                { q: "Does the AI train on my data?", a: "No. We have strict zero-data retention agreements with our LLM providers. Your data is used purely for inference and is never used to train global models." }
              ].map((faq, i) => (
                <FaqItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* 9. Closing CTA */}
        <section className="w-full py-32 lg:py-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-purple-500/20 rounded-full blur-[100px] -z-10" />
          
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-8">
              Ready to build your personal <br className="hidden sm:block"/>semantic web?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-medium">
              Join thousands of forward-thinking professionals who have already supercharged their memory.
            </p>
            <Link
              to="/signup"
              className="btn-cta-glow inline-flex h-16 items-center justify-center rounded-2xl font-black tracking-wider uppercase px-10 text-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Create an Account
            </Link>
          </div>
        </section>
      </main>

      {/* 10. Footer */}
      <footer className="w-full border-t border-border/40 bg-background py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm flex items-center justify-center text-white border border-purple-400/30">
              <Logo />
            </div>
            <span className="text-lg font-bold tracking-tight">SecondBrain</span>
          </div>
          
          <p className="text-sm font-medium text-muted-foreground">
            © 2026 Second Brain Inc. All rights reserved.
          </p>
          
          <div className="flex gap-3">
            <a
              href="https://x.com/hpandey_14"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all duration-150"
              aria-label="Twitter"
            >
              {/* Twitter/X SVG */}
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/14-himanshu/secondbrain-monorepo"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all duration-150"
              aria-label="GitHub"
            >
              {/* GitHub SVG */}
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a href="#" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center">Privacy</a>
            <a href="#" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
