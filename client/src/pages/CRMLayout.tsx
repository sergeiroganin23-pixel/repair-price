import { useState } from "react";
import { Switch, Route } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  ClipboardList, Users, Package, Wallet, BarChart3,
  ChevronLeft, ChevronRight, Menu, X, LogOut, Home, Banknote
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

function SidebarLink({ href, icon: Icon, label, collapsed }: { href: string; icon: any; label: string; collapsed: boolean }) {
  const [location] = useHashLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function CRMLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}>
        <div className="h-14 flex items-center justify-between px-3 border-b border-border">
          {!collapsed && <span className="font-bold text-sm">CRM</span>}
          <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-1">
          {navItems.map(item => (
            <SidebarLink key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>
        <div className="p-2 border-t border-border space-y-1">
          <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors`}>
            <Home className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Прайс-лист</span>}
          </Link>
          <button onClick={logout} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors`}>
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <span className="font-bold">CRM</span>
              <Button size="icon" variant="ghost" onClick={() => setMobileOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <nav className="flex-1 p-3 flex flex-col gap-1">
              {navItems.map(item => (
                <button key={item.href} onClick={() => setMobileOpen(false)} className="text-left">
                  <SidebarLink {...item} collapsed={false} />
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-border space-y-1">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted">
                <Home className="w-4 h-4" /><span>Прайс-лист</span>
              </Link>
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted">
                <LogOut className="w-4 h-4" /><span>Выйти</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden h-14 flex items-center gap-3 px-4 border-b border-border bg-card">
          <Button size="icon" variant="ghost" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></Button>
          <span className="font-bold text-sm">CRM — Это сервис</span>
          <div className="ml-auto text-sm text-muted-foreground">{user?.displayName}</div>
        </header>

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
  );
}
