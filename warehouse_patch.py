with open('/home/user/workspace/repair-prices/client/src/pages/WarehousePage.tsx', 'r') as f:
    content = f.read()

# 1. Add PartCategory to imports
old_import = 'import type { Part, PartMovement } from "@shared/schema";'
new_import = 'import type { Part, PartMovement, PartCategory } from "@shared/schema";'
content = content.replace(old_import, new_import, 1)

# 2. Remove hardcoded PART_CATEGORIES
old_cats = '''const PART_CATEGORIES = [
  "Дисплеи", "Аккумуляторы", "Задние крышки", "Разъёмы",
  "Кнопки", "Камеры", "Динамики", "Микрофоны", "Платы", "Другое",
];

function formatDate'''

new_cats = '''function formatDate'''
content = content.replace(old_cats, new_cats, 1)

# 3. In PartForm: add useQuery for part-categories, replace hardcoded select
old_form_select = '''  const { toast } = useToast();
  const [form, setForm] = useState({
    name: part?.name || "",
    sku: part?.sku || "",
    category: part?.category || "",
    quantity: part?.quantity?.toString() || "0",
    minQuantity: part?.minQuantity?.toString() || "1",
    buyPrice: part?.buyPrice?.toString() || "",
    sellPrice: part?.sellPrice?.toString() || "",
    notes: part?.notes || "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));'''

new_form_select = '''  const { toast } = useToast();
  const { data: partCats = [] } = useQuery<PartCategory[]>({
    queryKey: ["/api/part-categories"],
    queryFn: () => apiRequest("GET", "/api/part-categories").then(r => r.json()),
  });
  const [form, setForm] = useState({
    name: part?.name || "",
    sku: part?.sku || "",
    category: part?.category || "",
    quantity: part?.quantity?.toString() || "0",
    minQuantity: part?.minQuantity?.toString() || "1",
    buyPrice: part?.buyPrice?.toString() || "",
    sellPrice: part?.sellPrice?.toString() || "",
    notes: part?.notes || "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));'''
content = content.replace(old_form_select, new_form_select, 1)

# 4. Replace hardcoded PART_CATEGORIES in SelectContent
old_select_items = '''            <SelectContent>
              {PART_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>'''
new_select_items = '''            <SelectContent>
              {partCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>'''
content = content.replace(old_select_items, new_select_items, 1)

# 5. In WarehousePage main: add useQuery for partCategories, replace filter dropdown
old_warehouse_cats = '''  const { data: parts = [], isLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });'''

new_warehouse_cats = '''  const { data: parts = [], isLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const { data: partCats = [] } = useQuery<PartCategory[]>({
    queryKey: ["/api/part-categories"],
    queryFn: () => apiRequest("GET", "/api/part-categories").then(r => r.json()),
  });'''
content = content.replace(old_warehouse_cats, new_warehouse_cats, 1)

# 6. Replace filter category dropdown to use API categories
old_filter_cats = '''        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>'''

new_filter_cats = '''        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {partCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>'''
content = content.replace(old_filter_cats, new_filter_cats, 1)

# 7. Remove old categories derived from parts (now using API)
old_cats_derive = '''  const categories = Array.from(new Set(parts.map(p => p.category).filter(Boolean)));

  if (isLoading)'''
new_cats_derive = '''  if (isLoading)'''
content = content.replace(old_cats_derive, new_cats_derive, 1)

with open('/home/user/workspace/repair-prices/client/src/pages/WarehousePage.tsx', 'w') as f:
    f.write(content)

print("WarehousePage patched OK")
