import re

with open('/home/user/workspace/repair-prices/client/src/pages/AdminPage.tsx', 'r') as f:
    content = f.read()

NEW_TABS = '''
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

'''

MARKER = '// ─── Main Admin Page'

if MARKER in content:
    content = content.replace(MARKER, NEW_TABS + MARKER, 1)
    with open('/home/user/workspace/repair-prices/client/src/pages/AdminPage.tsx', 'w') as f:
        f.write(content)
    print("OK - inserted new tabs")
else:
    print("ERROR - marker not found")
