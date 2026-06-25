import { useState, useEffect } from "react";
import { Switch, Route, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/lib/auth";
import {
  ClipboardList, Users, Package, Wallet, BarChart3,
  ChevronLeft, ChevronRight, Menu, X, LogOut, Home,
  Banknote, LayoutList, Truck, ShieldCheck, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OrdersPage from "./OrdersPage";
import ClientsPage from "./ClientsPage";
import WarehousePage from "./WarehousePage";
import FinancePage from "./FinancePage";
import SalaryPage from "./SalaryPage";

const navItems = [
  { href: "/crm/orders",    icon: ClipboardList, label: "Заявки" },
  { href: "/crm/clients",   icon: Users,         label: "Клиенты" },
  { href: "/crm/warehouse", icon: Package,        label: "Склад" },
  { href: "/crm/finance",   icon: Wallet,         label: "Финансы" },
  { href: "/crm/salary",    icon: Banknote,       label: "Зарплата" },
  { href: "/crm/analytics", icon: BarChart3,      label: "Аналитика" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return (
    <Button size="icon" variant="ghost" onClick={() => setDark(d => !d)} className="h-8 w-8">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function SidebarLink({ href, icon: Icon, label, collapsed }: { href: string; icon: any; label: string; collapsed: boolean }) {
  const [location] = useHashLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? "bg-white/15 text-white shadow-sm"
        : "text-slate-300 hover:text-white hover:bg-white/10"
    }`}>
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function CRMLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Общая шапка (как в прайс-листе) ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border h-14 flex items-center">
        <div className="w-full px-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M4 3h11l5 5v13H4V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M15 3v5h5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M7 11h10M7 14h7M7 17h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-sm hidden sm:block">Это сервис</span>
          </Link>

          {/* Top nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 px-4">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <LayoutList className="w-4 h-4" />
              <span>Прайс-лист</span>
            </Link>
            <Link href="/suppliers" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Truck className="w-4 h-4" />
              <span>Поставщики</span>
            </Link>
            <Link href="/crm/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground transition-colors">
              <ClipboardList className="w-4 h-4" />
              <span>CRM</span>
            </Link>
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <ShieldCheck className="w-4 h-4" />
                <span>Админ</span>
              </Link>
            )}
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

      {/* ── Тело: sidebar + контент ── */}
      <div className="flex flex-1 min-h-0">

        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex flex-col bg-slate-800 dark:bg-slate-900 transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}>
          <div className={`h-12 flex items-center border-b border-white/10 px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Навигация</span>}
            <button onClick={() => setCollapsed(c => !c)} className="text-white/50 hover:text-white transition-colors p-1 rounded">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 p-2 flex flex-col gap-0.5">
            {navItems.map(item => (
              <SidebarLink key={item.href} {...item} collapsed={collapsed} />
            ))}
          </nav>

          {/* User info внизу */}
          <div className="border-t border-white/10 p-3">
            {!collapsed && (
              <div className="mb-2 px-1">
                <p className="text-white text-sm font-medium truncate">{user?.displayName}</p>
                <p className="text-slate-400 text-xs">{user?.role === "admin" ? "Администратор" : "Мастер"}</p>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-800 flex flex-col">
              <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
                <span className="text-white font-bold">CRM</span>
                <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <nav className="flex-1 p-3 flex flex-col gap-0.5">
                {navItems.map(item => (
                  <div key={item.href} onClick={() => setMobileOpen(false)}>
                    <SidebarLink {...item} collapsed={false} />
                  </div>
                ))}
              </nav>
              <div className="border-t border-white/10 p-4">
                <p className="text-white text-sm font-medium">{user?.displayName}</p>
                <p className="text-slate-400 text-xs">{user?.role === "admin" ? "Администратор" : "Мастер"}</p>
              </div>
            </aside>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Mobile top bar */}
          <div className="md:hidden h-12 flex items-center gap-3 px-4 border-b border-border bg-slate-800">
            <button onClick={() => setMobileOpen(true)} className="text-white/70 hover:text-white"><Menu className="w-5 h-5" /></button>
            <span className="text-white font-semibold text-sm">CRM</span>
          </div>

          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/crm/orders"    component={OrdersPage} />
              <Route path="/crm/clients"   component={ClientsPage} />
              <Route path="/crm/warehouse" component={WarehousePage} />
              <Route path="/crm/finance"   component={FinancePage} />
              <Route path="/crm/salary"    component={SalaryPage} />
              <Route path="/crm/analytics" component={() => (
                <div className="p-8 text-center text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Аналитика — Этап 5</p>
                  <p className="text-sm mt-2">Скоро здесь появятся графики и отчёты</p>
                </div>
              )} />
              <Route component={() => (
                <div className="p-8 text-center text-muted-foreground">Выберите раздел в меню слева</div>
              )} />
            </Switch>
          </main>
        </div>
      </div>
    </div>
  );
}
