import { useState } from "react";
import { Switch, Route, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/lib/auth";
import {
  ClipboardList, Users, Package, Wallet, BarChart3,
  ChevronLeft, ChevronRight, Menu, X, LogOut, Home, Banknote
} from "lucide-react";
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

function SidebarLink({ href, icon: Icon, label, collapsed, onClick }: {
  href: string; icon: any; label: string; collapsed: boolean; onClick?: () => void;
}) {
  const [location] = useHashLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all select-none ${
        active
          ? "bg-blue-600 text-white shadow"
          : "text-slate-300 hover:text-white hover:bg-slate-700"
      }`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function CRMLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (isMobile = false) => (
    <>
      {/* Header */}
      <div className={`h-14 flex items-center border-b border-slate-700 px-3 shrink-0 ${collapsed && !isMobile ? "justify-center" : "justify-between"}`}>
        {(!collapsed || isMobile) && (
          <span className="text-white font-bold text-base tracking-tight">CRM</span>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(item => (
          <SidebarLink
            key={item.href}
            {...item}
            collapsed={collapsed && !isMobile}
            onClick={isMobile ? () => setMobileOpen(false) : undefined}
          />
        ))}
      </nav>

      {/* Bottom: home + user info + logout */}
      <div className="border-t border-slate-700 p-2 shrink-0">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ${collapsed && !isMobile ? "justify-center" : ""}`}
        >
          <Home className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Прайс-лист</span>}
        </Link>

        {(!collapsed || isMobile) && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-white text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-slate-400 text-xs">{user?.role === "admin" ? "Администратор" : "Мастер"}</p>
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ${collapsed && !isMobile ? "justify-center" : ""}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Выйти</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-800 transition-all duration-200 shrink-0 ${
          collapsed ? "w-[60px]" : "w-56"
        }`}
        style={{ minHeight: "100vh" }}
      >
        {sidebarContent()}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-800 flex flex-col">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 flex items-center gap-3 px-4 bg-slate-800 border-b border-slate-700 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-slate-300 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold text-sm">CRM — Это сервис</span>
        </div>

        <main className="flex-1 overflow-auto bg-background">
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
  );
}
