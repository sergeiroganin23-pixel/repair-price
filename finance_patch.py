with open('/home/user/workspace/repair-prices/client/src/pages/FinancePage.tsx', 'r') as f:
    content = f.read()

# 1. Add Cashbox to imports
old_import = 'import type { Transaction } from "@shared/schema";'
new_import = 'import type { Transaction, Cashbox } from "@shared/schema";'
content = content.replace(old_import, new_import, 1)

# 2. Remove hardcoded PAYMENT_LABELS
old_labels = '''const PAYMENT_LABELS: Record<string, string> = {
  cash: "Наличные", card: "Карта", transfer: "Перевод",
};

function formatDate'''
new_labels = '''function formatDate'''
content = content.replace(old_labels, new_labels, 1)

# 3. Update TransactionForm to accept cashboxes prop + use API cashboxes
old_form_sig = '''function TransactionForm({
  tx,
  defaultType,
  onClose,
}: {
  tx?: Transaction;
  defaultType?: "income" | "expense";
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    type: tx?.type || defaultType || "income",
    amount: tx?.amount?.toString() || "",
    category: tx?.category || "",
    description: tx?.description || "",
    paymentMethod: tx?.paymentMethod || "cash",
    date: tx?.date || today(),
  });'''

new_form_sig = '''function TransactionForm({
  tx,
  defaultType,
  onClose,
  cashboxes: cashboxList = [],
}: {
  tx?: Transaction;
  defaultType?: "income" | "expense";
  onClose: () => void;
  cashboxes?: Cashbox[];
}) {
  const { toast } = useToast();
  // paymentMethod теперь хранит cashboxId как строку (или имя для совместимости)
  const [form, setForm] = useState({
    type: tx?.type || defaultType || "income",
    amount: tx?.amount?.toString() || "",
    category: tx?.category || "",
    description: tx?.description || "",
    paymentMethod: tx?.paymentMethod || "",
    date: tx?.date || today(),
  });'''
content = content.replace(old_form_sig, new_form_sig, 1)

# 4. Replace hardcoded payment method select
old_payment_select = '''      <div className="space-y-1.5">
        <Label>Способ оплаты</Label>
        <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Наличные</SelectItem>
            <SelectItem value="card">Карта</SelectItem>
            <SelectItem value="transfer">Перевод</SelectItem>
          </SelectContent>
        </Select>
      </div>'''

new_payment_select = '''      <div className="space-y-1.5">
        <Label>Касса / Способ оплаты</Label>
        <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
          <SelectTrigger><SelectValue placeholder="Выберите кассу..." /></SelectTrigger>
          <SelectContent>
            {cashboxList.length > 0
              ? cashboxList.filter(c => c.isActive).map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))
              : <>
                  <SelectItem value="Наличные">Наличные</SelectItem>
                  <SelectItem value="Карта">Карта</SelectItem>
                  <SelectItem value="Перевод">Перевод</SelectItem>
                </>
            }
          </SelectContent>
        </Select>
      </div>'''
content = content.replace(old_payment_select, new_payment_select, 1)

# 5. In TxRow: replace PAYMENT_LABELS with simple display of paymentMethod value
old_tx_badge = '''          <Badge variant="outline" className="text-xs">{PAYMENT_LABELS[tx.paymentMethod || "cash"]}</Badge>'''
new_tx_badge = '''          {tx.paymentMethod && <Badge variant="outline" className="text-xs">{tx.paymentMethod}</Badge>}'''
content = content.replace(old_tx_badge, new_tx_badge, 1)

# 6. In FinancePage main: add cashboxes query, pass to forms
old_main_state = '''  const { data: txList = [], isLoading } = useQuery<Transaction[]>({'''
new_main_state = '''  const { data: cashboxList = [] } = useQuery<Cashbox[]>({
    queryKey: ["/api/cashboxes"],
    queryFn: () => apiRequest("GET", "/api/cashboxes?active=true").then(r => r.json()),
  });

  const { data: txList = [], isLoading } = useQuery<Transaction[]>({'''
content = content.replace(old_main_state, new_main_state, 1)

# 7. Pass cashboxes to TransactionForm (createType dialog)
old_form_create = '''          {createType && (
            <TransactionForm defaultType={createType} onClose={() => setCreateType(null)} />
          )}'''
new_form_create = '''          {createType && (
            <TransactionForm defaultType={createType} onClose={() => setCreateType(null)} cashboxes={cashboxList} />
          )}'''
content = content.replace(old_form_create, new_form_create, 1)

# 8. Pass cashboxes to TransactionForm (editTx dialog)
old_form_edit = '''          {editTx && <TransactionForm tx={editTx} onClose={() => setEditTx(null)} />}'''
new_form_edit = '''          {editTx && <TransactionForm tx={editTx} onClose={() => setEditTx(null)} cashboxes={cashboxList} />}'''
content = content.replace(old_form_edit, new_form_edit, 1)

with open('/home/user/workspace/repair-prices/client/src/pages/FinancePage.tsx', 'w') as f:
    f.write(content)

print("FinancePage patched OK")
