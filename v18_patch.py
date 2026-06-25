import re, os

ROOT = "/home/user/workspace/repair-prices"

# ═══════════════════════════════════════════════════════════════════════════
# 1. schema.ts — добавить таблицу repair_parts
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/shared/schema.ts") as f:
    schema = f.read()

NEW_SCHEMA = '''
// ─── Repair Parts (запчасти и работы в заявке) ──────────────────────────────
export const repairParts = sqliteTable("repair_parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairId: integer("repair_id").notNull(),
  // Тип строки: запчасть со склада или ручная работа
  type: text("type").notNull().default("part"), // "part" | "work"
  // Если со склада — partId; если ручная — null
  partId: integer("part_id"),
  name: text("name").notNull(),        // название (скопировано с запчасти или введено вручную)
  quantity: integer("quantity").notNull().default(1),
  price: real("price").notNull().default(0),   // цена за единицу
  createdAt: text("created_at").notNull(),
});
export const insertRepairPartSchema = createInsertSchema(repairParts).omit({ id: true });
export type InsertRepairPart = z.infer<typeof insertRepairPartSchema>;
export type RepairPart = typeof repairParts.$inferSelect;
'''

MARKER = "// ─── Part Categories"
if MARKER in schema:
    schema = schema.replace(MARKER, NEW_SCHEMA + "\n" + MARKER, 1)
    with open(f"{ROOT}/shared/schema.ts", "w") as f:
        f.write(schema)
    print("schema.ts OK")
else:
    print("schema.ts MARKER NOT FOUND")

# ═══════════════════════════════════════════════════════════════════════════
# 2. storage.ts — импорт + CREATE TABLE + CRUD методы
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/server/storage.ts") as f:
    storage = f.read()

# 2a. Добавить repairParts в импорт таблиц
storage = storage.replace(
    "  partCategories, cashboxes,",
    "  partCategories, cashboxes, repairParts,",
    1
)

# 2b. Добавить типы в импорт
storage = storage.replace(
    "  type PartCategory, type InsertPartCategory,\n  type Cashbox, type InsertCashbox,",
    "  type PartCategory, type InsertPartCategory,\n  type Cashbox, type InsertCashbox,\n  type RepairPart, type InsertRepairPart,",
    1
)

# 2c. Добавить CREATE TABLE в migrations
OLD_CASHBOXES_DDL = """  CREATE TABLE IF NOT EXISTS cashboxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cash',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
`);"""

NEW_CASHBOXES_DDL = """  CREATE TABLE IF NOT EXISTS cashboxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cash',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS repair_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'part',
    part_id INTEGER,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);"""

storage = storage.replace(OLD_CASHBOXES_DDL, NEW_CASHBOXES_DDL, 1)

# 2d. Добавить CRUD методы перед закрывающей скобкой класса
OLD_END = """  deleteCashbox(id: number) {
    db.delete(cashboxes).where(eq(cashboxes.id, id)).run();
  }
}

export const storage = new SQLiteStorage();"""

NEW_END = """  deleteCashbox(id: number) {
    db.delete(cashboxes).where(eq(cashboxes.id, id)).run();
  }

  // ─── Repair Parts (запчасти и работы в заявке) ───────────────────────────────
  getRepairParts(repairId: number) {
    return db.select().from(repairParts).where(eq(repairParts.repairId, repairId)).all();
  }
  addRepairPart(data: InsertRepairPart) {
    return db.insert(repairParts).values(data).returning().get();
  }
  deleteRepairPart(id: number) {
    db.delete(repairParts).where(eq(repairParts.id, id)).run();
  }
  updateRepairPart(id: number, data: Partial<InsertRepairPart>) {
    return db.update(repairParts).set(data).where(eq(repairParts.id, id)).returning().get();
  }
}

export const storage = new SQLiteStorage();"""

storage = storage.replace(OLD_END, NEW_END, 1)

with open(f"{ROOT}/server/storage.ts", "w") as f:
    f.write(storage)
print("storage.ts OK")

# ═══════════════════════════════════════════════════════════════════════════
# 3. routes.ts — добавить роуты repair_parts
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/server/routes.ts") as f:
    routes = f.read()

NEW_ROUTES = """
  // ─── Repair Parts ────────────────────────────────────────────────────────────
  app.get("/api/repairs/:id/parts", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getRepairParts(parseInt(req.params.id)));
  });

  app.post("/api/repairs/:id/parts", authenticateToken, (req: AuthRequest, res: Response) => {
    const repairId = parseInt(req.params.id);
    const { type, partId, name, quantity, price } = req.body;
    if (!name) return res.status(400).json({ error: "Название обязательно" });
    const now = new Date().toISOString();
    const entry = storage.addRepairPart({
      repairId,
      type: type || "part",
      partId: partId ? parseInt(partId) : null,
      name,
      quantity: quantity || 1,
      price: price || 0,
      createdAt: now,
    });
    // Если тип "part" и partId указан — списываем со склада
    if (type === "part" && partId) {
      try {
        storage.createPartMovement({
          partId: parseInt(partId),
          type: "out",
          quantity: quantity || 1,
          price: price || null,
          repairId,
          comment: `Заявка #${repairId}`,
          createdAt: now,
        });
      } catch (e) {
        console.error("[repair_parts] movement error:", e);
      }
    }
    res.json(entry);
  });

  app.delete("/api/repairs/:repairId/parts/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    storage.deleteRepairPart(parseInt(req.params.id));
    res.json({ ok: true });
  });

  app.put("/api/repairs/:repairId/parts/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    const result = storage.updateRepairPart(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Не найдено" });
    res.json(result);
  });

"""

# Вставляем перед последней закрывающей скобкой функции registerRoutes
OLD_LAST = """  // ─── Cashboxes"""
routes = routes.replace(OLD_LAST, NEW_ROUTES + OLD_LAST, 1)

with open(f"{ROOT}/server/routes.ts", "w") as f:
    f.write(routes)
print("routes.ts OK")
