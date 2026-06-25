import { useQuery } from "@tanstack/react-query";
import { Building2, Phone, Globe, FileText, Truck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Supplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

function SupplierRow({ supplier }: { supplier: Supplier }) {
  const isOutsourcer = supplier.type === "outsourcer";
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`row-supplier-${supplier.id}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOutsourcer ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
            {isOutsourcer ? <Users className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
          </div>
          <span className="font-medium text-sm">{supplier.name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={`text-xs ${isOutsourcer ? "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400" : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"}`}
        >
          {isOutsourcer ? "Аутсорсер" : "Поставщик"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {supplier.contact || "—"}
      </td>
      <td className="px-4 py-3">
        {supplier.phone ? (
          <a
            href={`tel:${supplier.phone}`}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Phone className="w-3.5 h-3.5" />
            {supplier.phone}
          </a>
        ) : <span className="text-muted-foreground text-sm">—</span>}
      </td>
      <td className="px-4 py-3">
        {supplier.website ? (
          <a
            href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Globe className="w-3.5 h-3.5" />
            {supplier.website}
          </a>
        ) : <span className="text-muted-foreground text-sm">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
        {supplier.notes ? (
          <div className="flex items-start gap-1.5">
            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{supplier.notes}</span>
          </div>
        ) : "—"}
      </td>
    </tr>
  );
}

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/suppliers");
      if (!res.ok) throw new Error("Ошибка загрузки");
      return res.json();
    },
  });

  const suppliersList = suppliers?.filter(s => s.type === "supplier") || [];
  const outsourcersList = suppliers?.filter(s => s.type === "outsourcer") || [];

  function renderTable(title: string, list: Supplier[], icon: React.ReactNode, color: string) {
    return (
      <div className="mb-8">
        <div className={`flex items-center gap-3 mb-4`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{list.length} записей</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : list.length > 0 ? (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Название</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Тип</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Контакт</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Телефон</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Сайт</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {list.sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
                    <SupplierRow key={s.id} supplier={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-xl py-10 text-center text-muted-foreground text-sm">
            Записи не добавлены
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Поставщики и аутсорсеры</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Контакты для закупок и передачи работ</p>
      </div>

      {renderTable(
        "Поставщики запчастей",
        suppliersList,
        <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        "bg-blue-100 dark:bg-blue-900/30"
      )}
      {renderTable(
        "Аутсорсеры",
        outsourcersList,
        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        "bg-purple-100 dark:bg-purple-900/30"
      )}
    </div>
  );
}
