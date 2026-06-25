import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Shield } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Ошибка входа", description: data.error, variant: "destructive" });
      } else {
        login(data.token, { id: 0, role: data.role, displayName: data.displayName });
        toast({ title: "Добро пожаловать!", description: `Вы вошли как ${data.displayName}` });
      }
    } catch {
      toast({ title: "Ошибка", description: "Не удалось подключиться к серверу", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <svg viewBox="0 0 32 32" fill="none" className="w-9 h-9" aria-label="RepairPrice">
              <path d="M6 4h14l6 6v18H6V4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M20 4v6h6" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 14h12M10 19h8M10 24h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">RepairPrice</h1>
            <p className="text-blue-300/70 text-sm mt-1">Внутренний прайс-лист сервисного центра</p>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Lock className="w-4 h-4" />
              <span>Вход для сотрудников</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-white/80">Логин</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Введите логин"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/80">Пароль</Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                data-testid="button-login"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11"
                disabled={loading || !username || !password}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? "Вход..." : "Войти"}
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-white/40 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Защищённое соединение · JWT авторизация</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/30 text-xs">
          По вопросам доступа обращайтесь к администратору
        </p>
      </div>
    </div>
  );
}
