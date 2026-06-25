import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, DeviceModel, Service, Supplier, ChangeRequest, RepairStatus, DeviceBrand, DeviceModelRepair, RepairIssue, PartCategory, Cashbox } from "@shared/schema";
import {
  Plus, Pencil, Trash2, Loader2, Check, X, MessageSquare,
  Smartphone, Wrench, Truck, Bell, UserPlus, Users, FolderPlus, FolderOpen,
  AlertCircle, Tag, ChevronRight, Package, Wallet, CreditCard, Banknote, ArrowLeftRight, ToggleLeft, ToggleRight,
} from "lucide-react";

type Subcategory = { id: number; categoryId: number; name: string; sortOrder: number };

// ─── Request Status Badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "status-pending",
    approved: "status-approved",
    rejected: "status-rejected",
  };
  const labels: Record<string, string> = {
    pending: "На рассмотрении",
    approved: "Одобрено",
    rejected: "Отклонено",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────
function RequestsTab() {
  const { toast } = useToast();
  const { data: requests, isLoading } = useQuery<ChangeRequest[]>({
    queryKey: ["/api/requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/requests");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const [comment, setComment] = useState<Record<number, string>>({});

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminComment }: { id: number; status: string; adminComment?: string }) => {
      const res = await apiRequest("PUT", `/api/requests/${id}`, { status, adminComment });
      if (!res.ok) throw new Error("Ошибка обновления");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({ title: "Статус обновлён" });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  const typeLabels: Record<string, string> = {
    price_change: "Изменение цены",
    new_service: "Новая услуга",
    new_model: "Новая модель",
    new_category: "Новая категория",
  };

  const sorted = requests ? [...requests].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-3">
      {sorted.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Нет запросов</p>
        </div>
      )}
      {sorted.map(req => (
        <div key={req.id} className="bg-card border border-border rounded-xl p-4 space-y-3" data-testid={`card-request-${req.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-xs">{typeLabels[req.type] || req.type}</Badge>
                <StatusBadge status={req.status} />
                <span className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <p className="text-sm font-medium">{req.description}</p>
              {req.proposedValue && (
                <p className="text-xs text-muted-foreground mt-1">
                  Предложенное значение: <span className="text-primary font-medium">{req.proposedValue}</span>
                </p>
              )}
            </div>
          </div>

          {req.status === "pending" && (
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Комментарий администратора (необязательно)"
                value={comment[req.id] || ""}
                onChange={e => setComment(prev => ({ ...prev, [req.id]: e.target.value }))}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 flex-1 bg-green-600 hover:bg-green-500"
                  onClick={() => updateMutation.mutate({ id: req.id, status: "approved", adminComment: comment[req.id] })}
                  disabled={updateMutation.isPending}
                >
                  <Check className="w-3.5 h-3.5" /> Одобрить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 flex-1"
                  onClick={() => updateMutation.mutate({ id: req.id, status: "rejected", adminComment: comment[req.id] })}
                  disabled={updateMutation.isPending}
                >
                  <X className="w-3.5 h-3.5" /> Отклонить
                </Button>
              </div>
            </div>
          )}
          {req.adminComment && (
            <div className="text-xs bg-muted rounded-lg px-3 py-2 text-muted-foreground flex gap-2">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {req.adminComment}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────
function CategoriesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Smartphone");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(editItem ? "PUT" : "POST", editItem ? `/api/categories/${editItem.id}` : "/api/categories", { name, icon });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowForm(false); setEditItem(null); setName(""); setIcon("Smartphone");
      toast({ title: editItem ? "Категория обновлена" : "Категория добавлена" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/categories/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setDeleteId(null); toast({ title: "Удалено" }); },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  function openEdit(cat: Category) { setEditItem(cat); setName(cat.name); setIcon(cat.icon); setShowForm(true); }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{categories?.length || 0} категорий</p>
        <Button size="sm" onClick={() => { setEditItem(null); setName(""); setIcon("Smartphone"); setShowForm(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (
        <div className="space-y-2">
          {categories?.sort((a,b) => a.sortOrder - b.sortOrder).map(cat => (
            <div key={cat.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3" data-testid={`row-category-${cat.id}`}>
              <span className="font-medium text-sm">{cat.name}</span>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(cat)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(cat.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? "Редактировать" : "Добавить"} категорию</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Например: iPhone" className="mt-1" />
            </div>
            <div>
              <Label>Иконка</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Smartphone">Smartphone (iPhone)</SelectItem>
                  <SelectItem value="Phone">Phone (Android)</SelectItem>
                  <SelectItem value="Gamepad2">Gamepad2 (Приставки)</SelectItem>
                  <SelectItem value="Laptop">Laptop</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editItem ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить категорию?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Models & Services Tab ──────────────────────────────────────────────────
function ModelsTab() {
  const { toast } = useToast();
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<number | null>(null); // null = без подкатегории / все
  const [selectedModel, setSelectedModel] = useState<number | null>(null);

  // Subcategory form
  const [showSubForm, setShowSubForm] = useState(false);
  const [editSub, setEditSub] = useState<Subcategory | null>(null);
  const [subName, setSubName] = useState("");

  // Model form
  const [showModelForm, setShowModelForm] = useState(false);
  const [modelName, setModelName] = useState("");
  const [modelSubId, setModelSubId] = useState<string>("none");
  const [editModel, setEditModel] = useState<DeviceModel | null>(null);

  // Service form
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcPriceMax, setSvcPriceMax] = useState("");
  const [svcDuration, setSvcDuration] = useState("");
  const [editSvc, setEditSvc] = useState<Service | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{type: "subcategory"|"model"|"service"; id: number} | null>(null);

  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const { data: subcats } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories", selectedCat],
    queryFn: async () => {
      if (!selectedCat) return [];
      const res = await apiRequest("GET", `/api/subcategories?categoryId=${selectedCat}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedCat,
  });

  const { data: models, isLoading: loadingModels } = useQuery<DeviceModel[]>({
    queryKey: ["/api/models", selectedCat, selectedSub],
    queryFn: async () => {
      if (!selectedCat) return [];
      if (selectedSub) {
        const res = await apiRequest("GET", `/api/models?subcategoryId=${selectedSub}`);
        if (!res.ok) throw new Error();
        return res.json();
      }
      const res = await apiRequest("GET", `/api/models?categoryId=${selectedCat}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedCat,
  });

  const { data: svcList, isLoading: loadingSvc } = useQuery<Service[]>({
    queryKey: ["/api/services", selectedModel],
    queryFn: async () => {
      if (!selectedModel) return [];
      const res = await apiRequest("GET", `/api/services?modelId=${selectedModel}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedModel,
  });

  // Subcategory mutations
  const subMutation = useMutation({
    mutationFn: async () => {
      const body = { categoryId: selectedCat, name: subName };
      const res = await apiRequest(editSub ? "PUT" : "POST", editSub ? `/api/subcategories/${editSub.id}` : "/api/subcategories", body);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories", selectedCat] });
      setShowSubForm(false); setSubName(""); setEditSub(null);
      toast({ title: "Готово" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const modelMutation = useMutation({
    mutationFn: async () => {
      const subcategoryId = modelSubId !== "none" ? parseInt(modelSubId) : null;
      const body = { categoryId: selectedCat, subcategoryId, name: modelName };
      const res = await apiRequest(editModel ? "PUT" : "POST", editModel ? `/api/models/${editModel.id}` : "/api/models", body);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models", selectedCat, selectedSub] });
      setShowModelForm(false); setModelName(""); setModelSubId("none"); setEditModel(null);
      toast({ title: "Готово" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const svcMutation = useMutation({
    mutationFn: async () => {
      const body = { deviceModelId: selectedModel, name: svcName, price: parseFloat(svcPrice), priceMax: svcPriceMax ? parseFloat(svcPriceMax) : null, duration: svcDuration || null };
      const res = await apiRequest(editSvc ? "PUT" : "POST", editSvc ? `/api/services/${editSvc.id}` : "/api/services", body);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedModel] });
      setShowSvcForm(false); setSvcName(""); setSvcPrice(""); setSvcPriceMax(""); setSvcDuration(""); setEditSvc(null);
      toast({ title: "Готово" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      const urlMap = {
        subcategory: `/api/subcategories/${deleteTarget.id}`,
        model: `/api/models/${deleteTarget.id}`,
        service: `/api/services/${deleteTarget.id}`,
      };
      await apiRequest("DELETE", urlMap[deleteTarget.type]);
    },
    onSuccess: () => {
      if (deleteTarget?.type === "subcategory") queryClient.invalidateQueries({ queryKey: ["/api/subcategories", selectedCat] });
      else if (deleteTarget?.type === "model") queryClient.invalidateQueries({ queryKey: ["/api/models", selectedCat, selectedSub] });
      else queryClient.invalidateQueries({ queryKey: ["/api/services", selectedModel] });
      setDeleteTarget(null);
      toast({ title: "Удалено" });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  function openSvcEdit(s: Service) {
    setEditSvc(s); setSvcName(s.name); setSvcPrice(String(s.price)); setSvcPriceMax(s.priceMax ? String(s.priceMax) : ""); setSvcDuration(s.duration || ""); setShowSvcForm(true);
  }

  // Filter models based on selected sub
  const displayModels = models
    ? (selectedSub
        ? models.filter(m => m.subcategoryId === selectedSub)
        : models.filter(m => !m.subcategoryId))
    : [];

  return (
    <div className="space-y-4">
      {/* Category selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Категория</Label>
        <div className="flex flex-wrap gap-2">
          {categories?.map(cat => (
            <Button key={cat.id} size="sm" variant={selectedCat === cat.id ? "default" : "outline"}
              onClick={() => { setSelectedCat(cat.id); setSelectedSub(null); setSelectedModel(null); }}>
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {selectedCat && (
        <>
          {/* Subcategory row */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-xs text-muted-foreground">Подкатегории</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => { setEditSub(null); setSubName(""); setShowSubForm(true); }}>
                <Plus className="w-3 h-3" /> Добавить
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={selectedSub === null ? "secondary" : "ghost"} className="h-7 text-xs"
                onClick={() => { setSelectedSub(null); setSelectedModel(null); }}>
                Без подкатегории
              </Button>
              {subcats?.sort((a,b) => a.sortOrder - b.sortOrder).map(sub => (
                <div key={sub.id} className="flex items-center gap-1 border border-border rounded-md">
                  <Button size="sm" variant={selectedSub === sub.id ? "secondary" : "ghost"} className="h-7 text-xs rounded-r-none border-r-0"
                    onClick={() => { setSelectedSub(sub.id); setSelectedModel(null); }}>
                    <FolderOpen className="w-3 h-3 mr-1" />{sub.name}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-l-none"
                    onClick={() => { setEditSub(sub); setSubName(sub.name); setShowSubForm(true); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive rounded-l-none"
                    onClick={() => setDeleteTarget({ type: "subcategory", id: sub.id })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Models list */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-muted-foreground">Модели</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                  onClick={() => { setEditModel(null); setModelName(""); setModelSubId(selectedSub ? String(selectedSub) : "none"); setShowModelForm(true); }}>
                  <Plus className="w-3 h-3" /> Добавить
                </Button>
              </div>
              <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {loadingModels ? <Skeleton className="h-32" /> : displayModels.map(m => (
                  <div key={m.id} onClick={() => setSelectedModel(m.id)}
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-border last:border-0 transition-colors ${selectedModel === m.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40"}`}>
                    <span className="text-sm font-medium">{m.name}</span>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); setEditModel(m); setModelName(m.name); setModelSubId(m.subcategoryId ? String(m.subcategoryId) : "none"); setShowModelForm(true); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "model", id: m.id }); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!loadingModels && displayModels.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Моделей нет</p>
                )}
              </div>
            </div>

            {/* Services list */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-muted-foreground">
                  {selectedModel ? "Услуги модели" : "Выберите модель"}
                </Label>
                {selectedModel && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => { setEditSvc(null); setSvcName(""); setSvcPrice(""); setSvcPriceMax(""); setSvcDuration(""); setShowSvcForm(true); }}>
                    <Plus className="w-3 h-3" /> Добавить
                  </Button>
                )}
              </div>
              <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {selectedModel ? (
                  loadingSvc ? <Skeleton className="h-32" /> : svcList?.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-primary font-semibold">
                          {s.price === 0 ? "Бесплатно" : `${s.price.toLocaleString("ru-RU")} ₽${s.priceMax ? ` – ${s.priceMax.toLocaleString("ru-RU")} ₽` : ""}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openSvcEdit(s)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget({ type: "service", id: s.id })}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Выберите модель слева</p>
                )}
                {selectedModel && !loadingSvc && !svcList?.length && (
                  <p className="text-sm text-muted-foreground text-center py-6">Услуги не добавлены</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Subcategory dialog */}
      <Dialog open={showSubForm} onOpenChange={v => !v && setShowSubForm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editSub ? "Редактировать" : "Добавить"} подкатегорию</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название</Label>
              <Input value={subName} onChange={e => setSubName(e.target.value)} placeholder="Например: Samsung A серия" className="mt-1" />
            </div>
            <Button className="w-full" onClick={() => subMutation.mutate()} disabled={!subName || subMutation.isPending}>
              {subMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editSub ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model dialog */}
      <Dialog open={showModelForm} onOpenChange={v => !v && setShowModelForm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editModel ? "Редактировать" : "Добавить"} модель</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название модели</Label>
              <Input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Например: Samsung A55" className="mt-1" />
            </div>
            <div>
              <Label>Подкатегория</Label>
              <Select value={modelSubId} onValueChange={setModelSubId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без подкатегории</SelectItem>
                  {subcats?.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => modelMutation.mutate()} disabled={!modelName || modelMutation.isPending}>
              {modelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editModel ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service dialog */}
      <Dialog open={showSvcForm} onOpenChange={v => !v && setShowSvcForm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editSvc ? "Редактировать" : "Добавить"} услугу</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название услуги</Label>
              <Input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Например: Замена аккумулятора" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Цена от (₽)</Label>
                <Input type="number" value={svcPrice} onChange={e => setSvcPrice(e.target.value)} placeholder="1500" className="mt-1" />
              </div>
              <div>
                <Label>Цена до (₽)</Label>
                <Input type="number" value={svcPriceMax} onChange={e => setSvcPriceMax(e.target.value)} placeholder="Необязательно" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Время выполнения</Label>
              <Input value={svcDuration} onChange={e => setSvcDuration(e.target.value)} placeholder="Например: 30 мин" className="mt-1" />
            </div>
            <Button className="w-full" onClick={() => svcMutation.mutate()} disabled={!svcName || !svcPrice || svcMutation.isPending}>
              {svcMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editSvc ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "subcategory" ? "Удалить подкатегорию?" : deleteTarget?.type === "model" ? "Удалить модель?" : "Удалить услугу?"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Suppliers Admin Tab ──────────────────────────────────────────────────
function SuppliersAdminTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", type: "supplier", contact: "", phone: "", website: "", notes: "" });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/suppliers");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(editItem ? "PUT" : "POST", editItem ? `/api/suppliers/${editItem.id}` : "/api/suppliers", form);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowForm(false); setEditItem(null); setForm({ name: "", type: "supplier", contact: "", phone: "", website: "", notes: "" });
      toast({ title: "Готово" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/suppliers/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] }); setDeleteId(null); toast({ title: "Удалено" }); },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  function openEdit(s: Supplier) {
    setEditItem(s); setForm({ name: s.name, type: s.type, contact: s.contact || "", phone: s.phone || "", website: s.website || "", notes: s.notes || "" }); setShowForm(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{suppliers?.length || 0} записей</p>
        <Button size="sm" onClick={() => { setEditItem(null); setForm({ name: "", type: "supplier", contact: "", phone: "", website: "", notes: "" }); setShowForm(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (
        <div className="space-y-2">
          {suppliers?.sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
            <div key={s.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3" data-testid={`row-supplier-admin-${s.id}`}>
              <div>
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.type === "outsourcer" ? "Аутсорсер" : "Поставщик"}{s.contact ? ` · ${s.contact}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Редактировать" : "Добавить"} контакт</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Название</Label>
              <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Тип</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Поставщик</SelectItem>
                  <SelectItem value="outsourcer">Аутсорсер</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Контактное лицо</Label>
              <Input value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} className="mt-1" />
            </div>
            <div>
              <Label>Телефон</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Сайт</Label>
              <Input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Примечание</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending}>
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editItem ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить запись?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Users Tab (список сотрудников + редактирование) ─────────────────────
type UserRow = { id: number; username: string; role: string; displayName: string };

function UsersTab() {
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [createForm, setCreateForm] = useState({ username: "", password: "", displayName: "", role: "master" });
  const [editForm, setEditForm] = useState({ displayName: "", role: "master", password: "" });

  const { data: users, isLoading } = useQuery<UserRow[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/users", createForm);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreate(false);
      setCreateForm({ username: "", password: "", displayName: "", role: "master" });
      toast({ title: "Пользователь создан", description: `Логин: ${data.username}` });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const body: Record<string, string> = { displayName: editForm.displayName, role: editForm.role };
      if (editForm.password) body.password = editForm.password;
      const res = await apiRequest("PUT", `/api/admin/users/${editUser.id}`, body);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditUser(null);
      toast({ title: "Сотрудник обновлён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Ошибка"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteId(null);
      toast({ title: "Сотрудник удалён" });
    },
    onError: (e: Error) => { setDeleteId(null); toast({ title: "Ошибка", description: e.message, variant: "destructive" }); },
  });

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditForm({ displayName: u.displayName, role: u.role, password: "" });
  }

  const roleLabel = (role: string) => role === "admin" ? "Администратор" : "Мастер";
  const roleColor = (role: string) => role === "admin"
    ? "bg-primary/10 text-primary border-primary/20"
    : "bg-muted text-muted-foreground border-border";

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{users?.length || 0} сотрудников</p>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5" data-testid="button-add-user">
          <UserPlus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {users?.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3" data-testid={`row-user-${u.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">{(u.displayName || u.username).charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{u.displayName || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${roleColor(u.role)}`}>
                  {roleLabel(u.role)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(u)} data-testid={`button-edit-user-${u.id}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)} data-testid={`button-delete-user-${u.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {!users?.length && (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Сотрудников нет</p>
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={v => !v && setShowCreate(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Добавить сотрудника</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Имя для отображения</Label>
              <Input value={createForm.displayName} onChange={e => setCreateForm(f => ({...f, displayName: e.target.value}))} placeholder="Иван Иванов" className="mt-1" />
            </div>
            <div>
              <Label>Логин</Label>
              <Input value={createForm.username} onChange={e => setCreateForm(f => ({...f, username: e.target.value}))} placeholder="ivan" className="mt-1" />
            </div>
            <div>
              <Label>Пароль (минимум 6 символов)</Label>
              <Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({...f, password: e.target.value}))} placeholder="••••••••" className="mt-1" />
            </div>
            <div>
              <Label>Роль</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({...f, role: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Мастер</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2" onClick={() => createMutation.mutate()} disabled={!createForm.username || !createForm.password || !createForm.displayName || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Редактировать сотрудника</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Имя для отображения</Label>
              <Input value={editForm.displayName} onChange={e => setEditForm(f => ({...f, displayName: e.target.value}))} className="mt-1" />
            </div>
            <div>
              <Label>Роль</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({...f, role: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Мастер</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Новый пароль (оставьте пустым чтобы не менять)</Label>
              <Input type="password" value={editForm.password} onChange={e => setEditForm(f => ({...f, password: e.target.value}))} placeholder="••••••••" className="mt-1" />
            </div>
            <Button className="w-full gap-2" onClick={() => editMutation.mutate()} disabled={!editForm.displayName || editMutation.isPending}>
              {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить изменения
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить пользователя?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// ─── Statuses Tab ─────────────────────────────────────────────────────────────
function StatusesTab() {
  const { toast } = useToast();
  const { data: statuses = [], isLoading } = useQuery<RepairStatus[]>({
    queryKey: ["/api/repair-statuses"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/repair-statuses"); return r.ok ? r.json() : []; },
  });

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RepairStatus | null>(null);
  const [form, setForm] = useState({ key: "", label: "", color: "bg-gray-500 text-white", scope: "both" });

  const COLORS = [
    { value: "bg-blue-500 text-white", label: "Синий" },
    { value: "bg-yellow-500 text-white", label: "Жёлтый" },
    { value: "bg-green-600 text-white", label: "Зелёный" },
    { value: "bg-red-500 text-white", label: "Красный" },
    { value: "bg-purple-500 text-white", label: "Фиолетовый" },
    { value: "bg-orange-500 text-white", label: "Оранжевый" },
    { value: "bg-gray-500 text-white", label: "Серый" },
    { value: "bg-teal-500 text-white", label: "Бирюзовый" },
  ];

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/repair-statuses", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/repair-statuses"] }); toast({ title: "Статус добавлен" }); setShowForm(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => apiRequest("PUT", `/api/repair-statuses/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/repair-statuses"] }); toast({ title: "Обновлено" }); setShowForm(false); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/repair-statuses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/repair-statuses"] }),
  });

  function openCreate() { setEditItem(null); setForm({ key: "", label: "", color: "bg-gray-500 text-white", scope: "both" }); setShowForm(true); }
  function openEdit(s: RepairStatus) { setEditItem(s); setForm({ key: s.key, label: s.label, color: s.color, scope: s.scope }); setShowForm(true); }
  function submit() {
    if (!form.key || !form.label) { toast({ title: "Заполните ключ и название", variant: "destructive" }); return; }
    if (editItem) updateMut.mutate({ id: editItem.id, d: form });
    else createMut.mutate(form);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Статусы отображаются в заявках. Ключ — латиница/кирилица без пробелов.</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Добавить</Button>
      </div>
      {isLoading ? <div className="h-20 bg-muted animate-pulse rounded-lg" /> : (
        <div className="space-y-2">
          {statuses.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>
              <span className="text-xs text-muted-foreground font-mono flex-1">{s.key}</span>
              <span className="text-xs text-muted-foreground">{s.scope === "orders" ? "Заказы" : s.scope === "email" ? "С почты" : "Оба"}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? "Редактировать статус" : "Новый статус"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Ключ (уникальный, без пробелов)</Label><Input value={form.key} onChange={e => setForm(p => ({...p, key: e.target.value}))} placeholder="в_работе" disabled={!!editItem} /></div>
            <div><Label>Название</Label><Input value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} placeholder="В работе" /></div>
            <div><Label>Цвет</Label>
              <Select value={form.color} onValueChange={v => setForm(p => ({...p, color: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COLORS.map(c => <SelectItem key={c.value} value={c.value}><span className={`px-2 py-0.5 rounded text-xs font-medium ${c.value}`}>{c.label}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Показывать в</Label>
              <Select value={form.scope} onValueChange={v => setForm(p => ({...p, scope: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Заказы и С почты</SelectItem>
                  <SelectItem value="orders">Только Заказы</SelectItem>
                  <SelectItem value="email">Только С почты</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>{editItem ? "Сохранить" : "Добавить"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Brands & Models Tab ──────────────────────────────────────────────────────
function BrandsTab() {
  const { toast } = useToast();
  const { data: brands = [] } = useQuery<DeviceBrand[]>({
    queryKey: ["/api/device-brands"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/device-brands"); return r.ok ? r.json() : []; },
  });

  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand | null>(null);
  const { data: models = [] } = useQuery<DeviceModelRepair[]>({
    queryKey: ["/api/device-models-repair", selectedBrand?.id],
    queryFn: async () => {
      if (!selectedBrand) return [];
      const r = await apiRequest("GET", `/api/device-models-repair?brandId=${selectedBrand.id}`);
      return r.ok ? r.json() : [];
    },
    enabled: !!selectedBrand,
  });

  const [brandInput, setBrandInput] = useState("");
  const [modelInput, setModelInput] = useState("");

  const addBrand = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/device-brands", { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/device-brands"] }); toast({ title: "Марка добавлена" }); setBrandInput(""); },
  });
  const delBrand = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/device-brands/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/device-brands"] }); setSelectedBrand(null); },
  });
  const addModel = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/device-models-repair", { brandId: selectedBrand!.id, name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/device-models-repair", selectedBrand?.id] }); toast({ title: "Модель добавлена" }); setModelInput(""); },
  });
  const delModel = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/device-models-repair/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/device-models-repair", selectedBrand?.id] }),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Марки */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Марки устройств</h3>
        <div className="flex gap-2 mb-3">
          <Input value={brandInput} onChange={e => setBrandInput(e.target.value)} placeholder="Название марки" className="flex-1"
            onKeyDown={e => e.key === "Enter" && brandInput.trim() && addBrand.mutate(brandInput.trim())} />
          <Button size="sm" onClick={() => brandInput.trim() && addBrand.mutate(brandInput.trim())} disabled={addBrand.isPending}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {brands.map(b => (
            <div key={b.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${selectedBrand?.id === b.id ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted"}`}
              onClick={() => setSelectedBrand(b)}>
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm">{b.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                onClick={e => { e.stopPropagation(); delBrand.mutate(b.id); }}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          {brands.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Нет марок</p>}
        </div>
      </div>

      {/* Модели */}
      <div>
        <h3 className="font-semibold text-sm mb-3">
          {selectedBrand ? `Модели — ${selectedBrand.name}` : "Выберите марку →"}
        </h3>
        {selectedBrand ? (
          <>
            <div className="flex gap-2 mb-3">
              <Input value={modelInput} onChange={e => setModelInput(e.target.value)} placeholder="Название модели" className="flex-1"
                onKeyDown={e => e.key === "Enter" && modelInput.trim() && addModel.mutate(modelInput.trim())} />
              <Button size="sm" onClick={() => modelInput.trim() && addModel.mutate(modelInput.trim())} disabled={addModel.isPending}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {models.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                  <span className="flex-1 text-sm">{m.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => delModel.mutate(m.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              {models.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Нет моделей</p>}
            </div>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
            Выберите марку слева
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Issues Tab ────────────────────────────────────────────────────────────────
function IssuesTab() {
  const { toast } = useToast();
  const { data: issues = [] } = useQuery<RepairIssue[]>({
    queryKey: ["/api/repair-issues"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/repair-issues"); return r.ok ? r.json() : []; },
  });

  const [input, setInput] = useState("");
  const [editItem, setEditItem] = useState<RepairIssue | null>(null);
  const [editName, setEditName] = useState("");

  const addMut = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/repair-issues", { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/repair-issues"] }); toast({ title: "Неисправность добавлена" }); setInput(""); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, name }: any) => apiRequest("PUT", `/api/repair-issues/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/repair-issues"] }); setEditItem(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/repair-issues/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/repair-issues"] }),
  });

  return (
    <div className="max-w-md">
      <p className="text-sm text-muted-foreground mb-3">Список неисправностей для выбора при создании заказа</p>
      <div className="flex gap-2 mb-4">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Новая неисправность..."
          onKeyDown={e => e.key === "Enter" && input.trim() && addMut.mutate(input.trim())} />
        <Button size="sm" onClick={() => input.trim() && addMut.mutate(input.trim())} disabled={addMut.isPending}><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-1.5">
        {issues.map(issue => (
          <div key={issue.id} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
            {editItem?.id === issue.id ? (
              <>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-7 text-sm"
                  onKeyDown={e => { if (e.key === "Enter") updateMut.mutate({ id: issue.id, name: editName }); if (e.key === "Escape") setEditItem(null); }} />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateMut.mutate({ id: issue.id, name: editName })}><Check className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditItem(null)}><X className="w-3.5 h-3.5" /></Button>
              </>
            ) : (
              <>
                <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm">{issue.name}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(issue); setEditName(issue.name); }}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(issue.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </div>
        ))}
        {issues.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Нет неисправностей</p>}
      </div>
    </div>
  );
}


// ─── Part Categories Tab (категории склада) ──────────────────────────────────
function PartCategoriesTab() {
  const { toast } = useToast();
  const { data: cats = [] } = useQuery<PartCategory[]>({
    queryKey: ["/api/part-categories"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/part-categories"); return r.ok ? r.json() : []; },
  });

  const [input, setInput] = useState("");
  const [editItem, setEditItem] = useState<PartCategory | null>(null);
  const [editName, setEditName] = useState("");

  const addMut = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/part-categories", { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/part-categories"] }); toast({ title: "Категория добавлена" }); setInput(""); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, name }: any) => apiRequest("PUT", `/api/part-categories/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/part-categories"] }); setEditItem(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/part-categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/part-categories"] }),
  });

  return (
    <div className="max-w-md">
      <p className="text-sm text-muted-foreground mb-3">Категории запчастей для фильтрации склада</p>
      <div className="flex gap-2 mb-4">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Новая категория..."
          onKeyDown={e => e.key === "Enter" && input.trim() && addMut.mutate(input.trim())} />
        <Button size="sm" onClick={() => input.trim() && addMut.mutate(input.trim())} disabled={addMut.isPending}><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-1.5">
        {cats.map(cat => (
          <div key={cat.id} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
            {editItem?.id === cat.id ? (
              <>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-7 text-sm"
                  onKeyDown={e => { if (e.key === "Enter") updateMut.mutate({ id: cat.id, name: editName }); if (e.key === "Escape") setEditItem(null); }} />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateMut.mutate({ id: cat.id, name: editName })}><Check className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditItem(null)}><X className="w-3.5 h-3.5" /></Button>
              </>
            ) : (
              <>
                <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm">{cat.name}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(cat); setEditName(cat.name); }}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </div>
        ))}
        {cats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Нет категорий</p>}
      </div>
    </div>
  );
}

// ─── Cashboxes Tab (кассы) ──────────────────────────────────────────────────
const CASHBOX_TYPES = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Безналичные / Терминал" },
  { value: "transfer", label: "Перевод" },
  { value: "custom", label: "Свой тип" },
];

function CashboxesTab() {
  const { toast } = useToast();
  const { data: boxes = [] } = useQuery<Cashbox[]>({
    queryKey: ["/api/cashboxes"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/cashboxes"); return r.ok ? r.json() : []; },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editBox, setEditBox] = useState<Cashbox | null>(null);
  const [form, setForm] = useState({ name: "", type: "cash" });
  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function openCreate() { setForm({ name: "", type: "cash" }); setCreateOpen(true); }
  function openEdit(box: Cashbox) { setForm({ name: box.name, type: box.type }); setEditBox(box); }

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/cashboxes", form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/cashboxes"] }); toast({ title: "Касса добавлена" }); setCreateOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/cashboxes/${editBox!.id}`, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/cashboxes"] }); toast({ title: "Касса обновлена" }); setEditBox(null); },
  });
  const toggleMut = useMutation({
    mutationFn: (box: Cashbox) => apiRequest("PUT", `/api/cashboxes/${box.id}`, { isActive: !box.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cashboxes"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/cashboxes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cashboxes"] }),
  });

  const typeLabel = (type: string) => CASHBOX_TYPES.find(x => x.value === type)?.label || type;

  const CashboxForm = ({ onSave, isPending }: { onSave: () => void; isPending: boolean }) => (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label>Название кассы *</Label>
        <Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Наличные, Терминал Sberbank..." />
      </div>
      <div className="space-y-1.5">
        <Label>Тип</Label>
        <div className="grid grid-cols-2 gap-2">
          {CASHBOX_TYPES.map(t => (
            <button key={t.value} onClick={() => setF("type", t.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                form.type === t.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {t.value === "cash" && <Banknote className="w-4 h-4" />}
              {t.value === "card" && <CreditCard className="w-4 h-4" />}
              {t.value === "transfer" && <ArrowLeftRight className="w-4 h-4" />}
              {t.value === "custom" && <Wallet className="w-4 h-4" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={() => { setCreateOpen(false); setEditBox(null); }}>Отмена</Button>
        <Button onClick={onSave} disabled={isPending || !form.name.trim()}>
          {isPending ? "Сохраняю..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Кассы для учёта поступлений (наличные, безналичные)</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {boxes.map(box => (
          <div key={box.id} className={`flex items-center gap-3 px-4 py-3 bg-card border rounded-xl transition-opacity ${!box.isActive ? "opacity-50" : ""} border-border`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              box.type === "cash" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
              box.type === "card" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
              box.type === "transfer" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" :
              "bg-muted text-muted-foreground"
            }`}>
              {box.type === "cash" && <Banknote className="w-4 h-4" />}
              {box.type === "card" && <CreditCard className="w-4 h-4" />}
              {box.type === "transfer" && <ArrowLeftRight className="w-4 h-4" />}
              {box.type === "custom" && <Wallet className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{box.name}</p>
              <p className="text-xs text-muted-foreground">{typeLabel(box.type)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleMut.mutate(box)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title={box.isActive ? "Отключить" : "Включить"}>
                {box.isActive
                  ? <ToggleRight className="w-5 h-5 text-green-600" />
                  : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
              </button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(box)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => { if (confirm(`Удалить кассу «${box.name}»?`)) deleteMut.mutate(box.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
        {boxes.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Нет касс</p>}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Добавить кассу</DialogTitle></DialogHeader>
          <CashboxForm onSave={() => createMut.mutate()} isPending={createMut.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBox} onOpenChange={v => !v && setEditBox(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Редактировать кассу</DialogTitle></DialogHeader>
          <CashboxForm onSave={() => updateMut.mutate()} isPending={updateMut.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: requests } = useQuery<ChangeRequest[]>({
    queryKey: ["/api/requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/requests");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Панель администратора</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Управление данными, запросами и пользователями</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="mb-6 flex-wrap h-auto gap-1 bg-muted/50">
          <TabsTrigger value="requests" className="gap-2 data-testid-requests">
            <Bell className="w-4 h-4" />
            Запросы
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">{pendingCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Smartphone className="w-4 h-4" /> Категории
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <Wrench className="w-4 h-4" /> Модели и услуги
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="w-4 h-4" /> Поставщики
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" /> Сотрудники
          </TabsTrigger>
          <TabsTrigger value="statuses" className="gap-2">
            <AlertCircle className="w-4 h-4" /> Статусы
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Smartphone className="w-4 h-4" /> Марки и модели
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <Tag className="w-4 h-4" /> Неисправности
          </TabsTrigger>
          <TabsTrigger value="partcats" className="gap-2">
            <Package className="w-4 h-4" /> Категории склада
          </TabsTrigger>
          <TabsTrigger value="cashboxes" className="gap-2">
            <Wallet className="w-4 h-4" /> Кассы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests"><RequestsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="models"><ModelsTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersAdminTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="statuses"><StatusesTab /></TabsContent>
        <TabsContent value="brands"><BrandsTab /></TabsContent>
        <TabsContent value="issues"><IssuesTab /></TabsContent>
        <TabsContent value="partcats"><PartCategoriesTab /></TabsContent>
        <TabsContent value="cashboxes"><CashboxesTab /></TabsContent>
      </Tabs>
    </div>
  );
}