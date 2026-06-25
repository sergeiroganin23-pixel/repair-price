import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, User, MapPin, Wrench, Tag, Calendar, Globe } from "lucide-react";
import type { Order } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  новая: "Новая",
  в_работе: "В работе",
  готово: "Готово",
  отказ: "Отказ",
  записал: "Записал",
};

const STATUS_COLORS: Record<string, string> = {
  новая: "bg-blue-500 text-white",
  в_работе: "bg-yellow-500 text-white",
  готово: "bg-green-600 text-white",
  отказ: "bg-red-500 text-white",
  записал: "bg-purple-500 text-white",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function OrderCard({ order }: { order: Order }) {
  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PUT", `/api/orders/${order.id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
  });

  const calledMutation = useMutation({
    mutationFn: (called: boolean) =>
      apiRequest("PUT", `/api/orders/${order.id}/called`, { called }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
  });

  return (
    <Card
      data-testid={`card-order-${order.id}`}
      className={`border ${order.status === "новая" ? "border-blue-400 dark:border-blue-600" : "border-border"}`}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] || "bg-muted text-foreground"}`}
            >
              {STATUS_LABELS[order.status] || order.status}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(order.createdAt)}
            </span>
          </div>

          {/* Status select */}
          <Select
            value={order.status}
            onValueChange={(val) => statusMutation.mutate(val)}
            disabled={statusMutation.isPending}
          >
            <SelectTrigger
              data-testid={`select-status-${order.id}`}
              className="h-7 text-xs w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-2">
        {/* Client info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {order.clientName && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{order.clientName}</span>
            </div>
          )}
          {order.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <a
                href={`tel:${order.phone}`}
                className="text-primary hover:underline font-medium"
              >
                {order.phone}
              </a>
            </div>
          )}
          {order.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{order.location}</span>
            </div>
          )}
          {order.sourceUrl && (
            <div className="flex items-center gap-2 col-span-full">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <a
                href={order.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline truncate"
              >
                {order.sourceUrl}
              </a>
            </div>
          )}
        </div>

        {/* Device / Issue info */}
        {(order.device || order.brand || order.issue || order.discount) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {order.device && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Wrench className="w-3 h-3" />
                {order.device}
              </Badge>
            )}
            {order.brand && (
              <Badge variant="secondary" className="text-xs">
                {order.brand}
              </Badge>
            )}
            {order.issue && (
              <Badge variant="outline" className="text-xs">
                {order.issue}
              </Badge>
            )}
            {order.discount && (
              <Badge className="text-xs bg-orange-500 text-white gap-1">
                <Tag className="w-3 h-3" />
                Скидка: {order.discount}
              </Badge>
            )}
          </div>
        )}

        {/* Called checkbox */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Checkbox
            id={`called-${order.id}`}
            data-testid={`checkbox-called-${order.id}`}
            checked={order.called}
            onCheckedChange={(checked) => calledMutation.mutate(!!checked)}
            disabled={calledMutation.isPending}
            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
          />
          <label
            htmlFor={`called-${order.id}`}
            className={`text-sm cursor-pointer select-none ${order.called ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}
          >
            {order.called ? "Прозвонил" : "Не прозвонил"}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 30_000, // каждые 30 сек
  });

  const newCount = orders.filter((o) => o.status === "новая").length;
  const totalCount = orders.length;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Заявки</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount === 0
              ? "Заявок пока нет"
              : `Всего: ${totalCount}${newCount > 0 ? ` · Новых: ${newCount}` : ""}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] })
          }
          data-testid="button-refresh-orders"
        >
          Обновить
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-4xl mb-3">📬</div>
          <p className="font-medium">Заявок нет</p>
          <p className="text-sm mt-1">
            Новые заявки появятся здесь автоматически при получении письма от
            квиза
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
