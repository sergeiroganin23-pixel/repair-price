import { useState } from "react";
import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";

import LoginPage from "@/pages/LoginPage";
import PriceListPage from "@/pages/PriceListPage";
import SuppliersPage from "@/pages/SuppliersPage";
import AdminPage from "@/pages/AdminPage";
import RequestModal from "@/pages/RequestModal";

import {
  LayoutList, Truck, ShieldCheck, LogOut, Menu, X, Sun, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  // Init on mount
  useState(() => {
    document.documentElement.classList.toggle("dark", dark);
  });

  return (
    <Button size="icon" variant="ghost" onClick={toggle} aria-label="Переключить тему" className="h-8 w-8">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-label="RepairPrice">
          <path d="M4 3h11l5 5v13H4V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M15 3v5h5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7 11h10M7 14h7M7 17h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="font-bold text-sm hidden sm:block">RepairPrice</span>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────
function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const [location] = useHashLocation();
  const isActive = location === href || (href === "/" && location === "");
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
    >
      {icon}
      <span className="hidden sm:block">{label}</span>
    </Link>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────
function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
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
            {isAdmin && <NavLink href="/admin" icon={<ShieldCheck className="w-4 h-4" />} label="Админ-панель" />}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden md:block text-sm text-muted-foreground">{user?.displayName}</span>
            <Button size="sm" variant="ghost" onClick={logout} className="gap-1.5 h-8 text-muted-foreground hover:text-foreground">
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
        {isAdmin && <NavLink href="/admin" icon={<ShieldCheck className="w-4 h-4" />} label="Админ" />}
      </div>

      {/* Content */}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={() => <PriceListPage onRequestOpen={() => setRequestOpen(true)} />} />
          <Route path="/suppliers" component={SuppliersPage} />
          {isAdmin && <Route path="/admin" component={AdminPage} />}
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

// ─── App Root ─────────────────────────────────────────────────────────────
function AuthGate() {
  const { user } = useAuth();

  if (!user) return (
    <>
      <LoginPage />
      <Toaster />
    </>
  );

  return <Layout><div /></Layout>;
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
