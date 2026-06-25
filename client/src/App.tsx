import { useState, useEffect, useRef } from "react";
import { Switch, Route, Router, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";

import LoginPage from "@/pages/LoginPage";
import PriceListPage from "@/pages/PriceListPage";
import SuppliersPage from "@/pages/SuppliersPage";
import AdminPage from "@/pages/AdminPage";
import RequestModal from "@/pages/RequestModal";
import CRMLayout from "@/pages/CRMLayout";

import {
  LayoutList, Truck, ShieldCheck, LogOut, Sun, Moon, LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── ThemeToggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  useState(() => {
    document.documentElement.classList.toggle("dark", dark);
  });

  return (
    <Button size="icon" variant="ghost" onClick={toggle} aria-label="Переключить тему" className="h-8 w-8">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-label="Это сервис">
          <path d="M4 3h11l5 5v13H4V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M15 3v5h5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7 11h10M7 14h7M7 17h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="font-bold text-sm hidden sm:block">Это сервис</span>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const [location] = useHashLocation();
  const isActive = location === href || (href === "/" && location === "");
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      <span className="hidden sm:block">{label}</span>
    </Link>
  );
}

// ─── CRM Button — с зелёной точкой если есть новые заявки ────────────────────
function CRMButton() {
  const prevRef = useRef<number | null>(null);
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/repairs/new-count"],
    refetchInterval: 30_000,
  });
  const count = data?.count ?? 0;

  // звук при появлении новых заявок даже когда мы на прайсе
  useEffect(() => {
    if (prevRef.current !== null && count > prevRef.current) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const t = ctx.currentTime;
        const play = (freq: number, when: number, dur: number) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.value = freq; osc.type = "sine";
          g.gain.setValueAtTime(0, when);
          g.gain.linearRampToValueAtTime(0.35, when + 0.01);
          g.gain.linearRampToValueAtTime(0, when + dur);
          osc.start(when); osc.stop(when + dur + 0.01);
        };
        play(880, t, 0.12);
        play(1100, t + 0.18, 0.12);
      } catch {}
    }
    prevRef.current = count;
  }, [count]);

  return (
    <Link
      href="/crm"
      className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
    >
      <LayoutDashboard className="w-4 h-4" />
      <span className="hidden sm:block">CRM</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 items-center justify-center text-white text-[8px] font-bold leading-none">
            {count > 9 ? "9+" : count}
          </span>
        </span>
      )}
    </Link>
  );
}

// ─── Layout (прайс-лист) ──────────────────────────────────────────────────────
function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Logo />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 px-4">
            <NavLink href="/" icon={<LayoutList className="w-4 h-4" />} label="Прайс-лист" />
            <NavLink href="/suppliers" icon={<Truck className="w-4 h-4" />} label="Поставщики" />
            <CRMButton />
            {isAdmin && (
              <NavLink href="/admin" icon={<ShieldCheck className="w-4 h-4" />} label="Админ-панель" />
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden md:block text-sm text-muted-foreground">{user?.displayName}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block text-xs">Выйти</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden border-b border-border bg-background px-4 py-2 flex gap-1">
        <NavLink href="/" icon={<LayoutList className="w-4 h-4" />} label="Прайс" />
        <NavLink href="/suppliers" icon={<Truck className="w-4 h-4" />} label="Партнёры" />
        <CRMButton />
        {isAdmin && (
          <NavLink href="/admin" icon={<ShieldCheck className="w-4 h-4" />} label="Админ" />
        )}
      </div>

      {/* Content */}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={() => <PriceListPage onRequestOpen={() => setRequestOpen(true)} />} />
          <Route path="/suppliers" component={SuppliersPage} />
          {isAdmin && <Route path="/admin" component={AdminPage} />}
          {/* CRM — полноэкранный раздел */}
          <Route path="/crm/:rest*" component={CRMLayout} />
          <Route path="/crm" component={CRMLayout} />
          <Route>
            <div className="text-center py-20 text-muted-foreground">Страница не найдена</div>
          </Route>
        </Switch>
      </main>

      <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
      <Toaster />
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function AuthGate() {
  const { user } = useAuth();

  if (!user)
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );

  return <Layout>{null}</Layout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <AuthGate />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
