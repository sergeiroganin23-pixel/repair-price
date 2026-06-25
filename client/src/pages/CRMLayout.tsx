import { useState } from "react";
import { Link, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import {
  Bell, Users, LayoutDashboard, ChevronLeft, Menu, X,
  Package, DollarSign, BarChart2, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OrdersPage from "@/pages/OrdersPage";
import ClientsPage from "@/pages/ClientsPage";
import WarehousePage from "@/pages/WarehousePage";

// ─── Звук уведомления ──────────────────────────────────────────────────────────
function _playBeep(ctx: AudioContext, t: number, freq: number, dur: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = "sine";
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.35, t + 0.01);
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;
    _playBeep(ctx, t, 880, 0.12);
    _playBeep(ctx, t + 0.18, 1100, 0.12);
  } catch {}
}

function useNewRepairsCount() {
  const prevRef = useRef<number | null>(null);
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/repairs/new-count"],
    refetchInterval: 30_000,
  });
  const count = data?.count ?? 0;
  useEffect(() => {
    if (prevRef.current !== null && count > prevRef.current) {
      playNotificationSound();
    }
    prevRef.current = count;
  }, [count]);
  return count;
}

// ─── Sidebar Item ──────────────────────────────────────────────────────────────
function SidebarItem({
  href,
  icon,
  label,
  badge,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  collapsed: boolean;
}) {
  const [location] = useHashLocation();
  const isActive = location.startsWith(href);

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${collapsed ? "justify-center" : ""}`}
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {badge != null && badge > 0 && (
        <span className={`${collapsed ? "absolute -top-1 -right-1" : "ml-auto"} flex h-5 w-5 items-center justify-center`}>
          <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 items-center justify-center text-white text-[9px] font-bold leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        </span>
      )}
    </Link>
  );
}

// ─── Заглушка для будущих разделов ────────────────────────────────────────────
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-3 text-muted-foreground">
      <LayoutDashboard className="w-12 h-12 opacity-20" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm">Раздел в разработке</p>
    </div>
  );
}

// ─── CRM Layout ────────────────────────────────────────────────────────────────
export default function CRMLayout() {
  const { user, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const newCount = useNewRepairsCount();

  const navItems = [
    { href: "/crm/orders", icon: <Bell className="w-4 h-4" />, label: "Заявки", badge: newCount },
    { href: "/crm/clients", icon: <Users className="w-4 h-4" />, label: "Клиенты" },
    { href: "/crm/warehouse", icon: <Package className="w-4 h-4" />, label: "Склад" },
    { href: "/crm/finance", icon: <DollarSign className="w-4 h-4" />, label: "Финансы" },
    { href: "/crm/analytics", icon: <BarChart2 className="w-4 h-4" />, label: "Аналитика" },
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`flex flex-col h-full bg-card border-r border-border transition-all duration-200 ${
        mobile ? "w-64" : collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center h-14 px-3 border-b border-border shrink-0 ${collapsed && !mobile ? "justify-center" : "justify-between"}`}>
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm truncate">CRM</span>
          </div>
        )}
        {!mobile && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            collapsed={collapsed && !mobile}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-border p-2 shrink-0 ${collapsed && !mobile ? "flex justify-center" : ""}`}>
        {(!collapsed || mobile) && (
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-medium text-foreground truncate">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role === "admin" ? "Администратор" : "Мастер"}</p>
          </div>
        )}
        <div className={`flex gap-1 ${collapsed && !mobile ? "flex-col" : ""}`}>
          <Link
            href="/"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Вернуться к прайсу"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            {(!collapsed || mobile) && <span>Прайс-лист</span>}
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={logout}
            className={`h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 ${collapsed && !mobile ? "w-7 px-0 justify-center" : "w-full justify-start px-2"}`}
            title="Выйти"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {(!collapsed || mobile) && <span>Выйти</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex shrink-0">
            <Sidebar mobile />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center h-14 px-4 border-b border-border bg-card shrink-0 gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <span className="font-bold text-sm">CRM — Это сервис</span>
          {newCount > 0 && (
            <span className="ml-auto flex h-5 w-5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 items-center justify-center text-white text-[9px] font-bold">
                {newCount > 9 ? "9+" : newCount}
              </span>
            </span>
          )}
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/crm/orders" component={OrdersPage} />
            <Route path="/crm/clients" component={ClientsPage} />
            <Route path="/crm/warehouse" component={WarehousePage} />
            <Route path="/crm/finance" component={() => <ComingSoon title="Финансы" />} />
            <Route path="/crm/analytics" component={() => <ComingSoon title="Аналитика" />} />
            <Route path="/crm">
              {/* Редирект на заявки */}
              <OrdersPage />
            </Route>
          </Switch>
        </div>
      </div>
    </div>
  );
}
