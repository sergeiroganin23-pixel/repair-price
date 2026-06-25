import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Smartphone, Phone, Gamepad2, ChevronDown, ChevronRight, Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, DeviceModel, Service } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const iconMap: Record<string, React.ReactNode> = {
  Smartphone: <Smartphone className="w-5 h-5" />,
  Phone: <Phone className="w-5 h-5" />,
  Gamepad2: <Gamepad2 className="w-5 h-5" />,
};

function formatPrice(price: number, priceMax?: number | null) {
  if (price === 0) return "Бесплатно";
  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
  return priceMax ? `${fmt(price)} – ${fmt(priceMax)}` : fmt(price);
}

// ─── Service Item ──────────────────────────────────────────────────────────
function ServiceRow({ service }: { service: Service }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground">{service.name}</span>
        {service.duration && (
          <span className="ml-2 text-xs text-muted-foreground">· {service.duration}</span>
        )}
      </div>
      <span className={`ml-4 text-sm font-semibold shrink-0 ${service.price === 0 ? "text-green-600 dark:text-green-400" : "text-primary"}`}>
        {formatPrice(service.price, service.priceMax)}
      </span>
    </div>
  );
}

// ─── Model Accordion ──────────────────────────────────────────────────────
function ModelAccordion({ model, search }: { model: DeviceModel; search: string }) {
  const isSearching = search.trim().length > 0;
  const nameMatches = model.name.toLowerCase().includes(search.toLowerCase());

  // Если идёт поиск и название модели не совпадает — не показываем
  if (isSearching && !nameMatches) return null;

  const [open, setOpen] = useState(false);
  const isOpen = open;

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services", model.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/services?modelId=${model.id}`);
      if (!res.ok) throw new Error("Ошибка загрузки");
      return res.json();
    },
    enabled: isOpen,
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-2">
      <button
        data-testid={`accordion-model-${model.id}`}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
      >
        <span className="font-medium text-sm">{model.name}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="accordion-content border-t border-border bg-card/50 px-2 py-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : services && services.length > 0 ? (
            <div>
              {services.map(svc => (
                <ServiceRow key={svc.id} service={svc} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Услуги не добавлены</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────
function CategorySection({ category, search }: { category: Category; search: string }) {
  const [open, setOpen] = useState(true);

  const { data: models, isLoading } = useQuery<DeviceModel[]>({
    queryKey: ["/api/models", category.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/models?categoryId=${category.id}`);
      if (!res.ok) throw new Error("Ошибка загрузки");
      return res.json();
    },
  });

  return (
    <section className="mb-8">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 mb-4 group"
        data-testid={`btn-category-${category.id}`}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          {iconMap[category.icon] || <Smartphone className="w-5 h-5" />}
        </div>
        <h2 className="text-lg font-semibold flex-1 text-left">{category.name}</h2>
        <div className="flex items-center gap-2">
          {models && (
            <Badge variant="secondary" className="text-xs">{models.length} моделей</Badge>
          )}
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="pl-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : models && models.length > 0 ? (
            [...models].sort((a, b) => {
              // Умная сортировка: сначала по номеру, потом по версии
              const parseModel = (name: string) => {
                const num = parseInt(name.match(/\d+/)?.[0] || "0");
                const suffix = name.toLowerCase();
                let order = 0;
                if (suffix.includes("pro max")) order = 4;
                else if (suffix.includes("pro")) order = 3;
                else if (suffix.includes("plus") || suffix.includes("+")) order = 2;
                else if (suffix.includes("mini")) order = 1;
                return { num, order, name };
              };
              const pa = parseModel(a.name);
              const pb = parseModel(b.name);
              if (pa.num !== pb.num) return pa.num - pb.num;
              if (pa.order !== pb.order) return pa.order - pb.order;
              return pa.name.localeCompare(pb.name, "ru");
            }).map(model => (
              <ModelAccordion key={model.id} model={model} search={search} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
              Модели не добавлены
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function PriceListPage({ onRequestOpen }: { onRequestOpen: () => void }) {
  const [search, setSearch] = useState("");
  const { data: categories, isLoading } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Прайс-лист</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Цены на ремонт устройств</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRequestOpen}
          data-testid="button-open-request"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Запрос на изменение
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          placeholder="Поиск по модели или услуге..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {/* Categories */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <Skeleton className="h-10 w-48 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map(j => <Skeleton key={j} className="h-12 w-full rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        [...categories]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(cat => (
            <CategorySection key={cat.id} category={cat} search={search} />
          ))
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Категории не добавлены</p>
        </div>
      )}
    </div>
  );
}
