import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import {
  users, sessions, categories, subcategories, deviceModels, services, suppliers, changeRequests, orders,
  clients, repairs, parts, partMovements, transactions, salaries,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Subcategory, type InsertSubcategory,
  type DeviceModel, type InsertDeviceModel,
  type Service, type InsertService,
  type Supplier, type InsertSupplier,
  type ChangeRequest, type InsertChangeRequest,
  type Order, type InsertOrder,
  type Client, type InsertClient,
  type Repair, type InsertRepair,
  type Part, type InsertPart,
  type PartMovement, type InsertPartMovement,
  type Transaction, type InsertTransaction,
  type Salary, type InsertSalary,
} from "@shared/schema";
import bcrypt from "bcryptjs";

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/data.db`
  : "data.db";
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// ─── Migrations ───────────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'master',
    display_name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Smartphone',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS device_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    subcategory_id INTEGER,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_model_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    price_max REAL,
    duration TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'supplier',
    contact TEXT,
    phone TEXT,
    website TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    target_id INTEGER,
    target_type TEXT,
    proposed_value TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_comment TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL UNIQUE,
    client_name TEXT,
    phone TEXT,
    discount TEXT,
    device TEXT,
    brand TEXT,
    issue TEXT,
    location TEXT,
    source_url TEXT,
    raw_text TEXT,
    status TEXT NOT NULL DEFAULT 'новая',
    called INTEGER NOT NULL DEFAULT 0,
    assigned_to INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    client_name TEXT,
    phone TEXT,
    email TEXT,
    device_type TEXT,
    brand TEXT,
    model TEXT,
    imei TEXT,
    appearance TEXT,
    issue TEXT,
    estimated_price REAL,
    final_price REAL,
    prepayment REAL,
    deadline TEXT,
    warranty TEXT,
    master_id INTEGER,
    master_comment TEXT,
    status TEXT NOT NULL DEFAULT 'новая',
    called INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual',
    message_id TEXT,
    source_url TEXT,
    discount TEXT,
    raw_text TEXT,
    location TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    buy_price REAL,
    sell_price REAL,
    supplier_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS part_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL,
    repair_id INTEGER,
    comment TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    repair_id INTEGER,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_at TEXT NOT NULL,
    date TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER NOT NULL,
    master_name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    repair_id INTEGER,
    period TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    date TEXT NOT NULL
  );
`);

// Seed default data if empty
function seedIfEmpty() {
  const existingUsers = db.select().from(users).all();
  if (existingUsers.length > 0) return;

  const adminHash = bcrypt.hashSync("admin123", 12);
  db.insert(users).values({ username: "admin", passwordHash: adminHash, role: "admin", displayName: "Администратор" }).run();
  const masterHash = bcrypt.hashSync("master123", 12);
  db.insert(users).values({ username: "master1", passwordHash: masterHash, role: "master", displayName: "Мастер Иван" }).run();

  db.insert(categories).values({ name: "iPhone", icon: "Smartphone", sortOrder: 1 }).run();
  db.insert(categories).values({ name: "Android", icon: "Phone", sortOrder: 2 }).run();
  db.insert(categories).values({ name: "Игровые приставки", icon: "Gamepad2", sortOrder: 3 }).run();

  const cat1 = db.select().from(categories).all()[0];
  const iphoneModels = [
    "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 mini", "iPhone 13",
    "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 mini", "iPhone 12",
    "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
    "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
    "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7",
    "iPhone SE (3-го поколения)", "iPhone SE (2-го поколения)",
  ];
  iphoneModels.forEach((name, i) => {
    db.insert(deviceModels).values({ categoryId: cat1.id, name, sortOrder: i }).run();
  });

  const allModels = db.select().from(deviceModels).all();
  const commonServices = [
    { name: "Замена дисплея (оригинал)", price: 4500, priceMax: 8000, duration: "30-60 мин" },
    { name: "Замена дисплея (копия)", price: 2000, priceMax: 4000, duration: "30 мин" },
    { name: "Замена стекла дисплея", price: 1500, priceMax: 3000, duration: "60-90 мин" },
    { name: "Замена аккумулятора", price: 1200, priceMax: 2500, duration: "20-40 мин" },
    { name: "Замена задней крышки", price: 1500, priceMax: 4000, duration: "30-60 мин" },
    { name: "Замена разъёма зарядки", price: 1000, priceMax: 2000, duration: "30 мин" },
    { name: "Замена кнопки Home", price: 800, priceMax: 1500, duration: "20 мин" },
    { name: "Замена кнопки питания", price: 900, priceMax: 1800, duration: "30 мин" },
    { name: "Замена камеры (задней)", price: 2000, priceMax: 5000, duration: "30-60 мин" },
    { name: "Замена камеры (фронтальной)", price: 1500, priceMax: 3000, duration: "30 мин" },
    { name: "Замена динамика разговорного", price: 800, priceMax: 1500, duration: "20 мин" },
    { name: "Замена динамика громкоговорителя", price: 900, priceMax: 1500, duration: "20 мин" },
    { name: "Замена вибромотора", price: 700, priceMax: 1200, duration: "20 мин" },
    { name: "Замена микрофона", price: 900, priceMax: 1500, duration: "30 мин" },
    { name: "Замена SIM-лотка", price: 400, priceMax: 800, duration: "15 мин" },
    { name: "Ремонт после воды (сушка)", price: 1000, priceMax: 3000, duration: "60-120 мин" },
    { name: "Разблокировка (программная)", price: 500, priceMax: 1500, duration: "30-60 мин" },
    { name: "Диагностика", price: 0, duration: "15 мин" },
  ];
  allModels.forEach((model, mi) => {
    commonServices.forEach((svc, si) => {
      const multiplier = Math.max(0.7, 1 - mi * 0.01);
      db.insert(services).values({
        deviceModelId: model.id,
        name: svc.name,
        price: Math.round(svc.price * multiplier),
        priceMax: svc.priceMax ? Math.round(svc.priceMax * multiplier) : null,
        duration: svc.duration || null,
        sortOrder: si,
      }).run();
    });
  });

  const existingSuppliers = db.select().from(suppliers).all();
  if (existingSuppliers.length === 0) {
    db.insert(suppliers).values({ name: "iFix Parts", type: "supplier", contact: "Алексей Петров", phone: "+7 999 111 22 33", website: "ifixparts.ru", notes: "Оригинальные запчасти Apple", sortOrder: 1 }).run();
    db.insert(suppliers).values({ name: "TechParts RU", type: "supplier", contact: "Менеджер продаж", phone: "+7 999 444 55 66", website: "techpartsru.com", notes: "Совместимые дисплеи и аккумуляторы", sortOrder: 2 }).run();
    db.insert(suppliers).values({ name: "ProMobile Parts", type: "supplier", contact: "Ирина Смирнова", phone: "+7 999 222 33 44", website: "promobile.ru", notes: "Запчасти для Android, Samsung, Xiaomi", sortOrder: 3 }).run();
    db.insert(suppliers).values({ name: "МастерСервис", type: "outsourcer", contact: "Дмитрий", phone: "+7 999 777 88 99", website: null, notes: "Аутсорс по платам, микропайка", sortOrder: 4 }).run();
    db.insert(suppliers).values({ name: "GameFix", type: "outsourcer", contact: "Сергей", phone: "+7 999 000 11 22", website: null, notes: "Ремонт игровых консолей PlayStation, Xbox", sortOrder: 5 }).run();
    db.insert(suppliers).values({ name: "DataRestore Pro", type: "outsourcer", contact: "Михаил", phone: "+7 999 333 44 55", website: "datarestore.ru", notes: "Восстановление данных с повреждённых устройств", sortOrder: 6 }).run();
  }
}

seedIfEmpty();

export class SQLiteStorage {
  // ─── Users ──────────────────────────────────────────────────────────────────
  getAllUsers() { return db.select().from(users).all(); }
  getUserByUsername(u: string) { return db.select().from(users).where(eq(users.username, u)).get(); }
  getUserById(id: number) { return db.select().from(users).where(eq(users.id, id)).get(); }
  createUser(data: InsertUser) { return db.insert(users).values(data).returning().get(); }
  updateUser(id: number, data: Partial<InsertUser>) { return db.update(users).set(data).where(eq(users.id, id)).returning().get(); }
  deleteUser(id: number) { db.delete(users).where(eq(users.id, id)).run(); }

  // ─── Sessions ────────────────────────────────────────────────────────────────
  createSession(userId: number, sessionId: string) {
    db.delete(sessions).where(eq(sessions.userId, userId)).run();
    return db.insert(sessions).values({ userId, sessionId, createdAt: new Date().toISOString() }).returning().get();
  }
  getSessionBySessionId(sessionId: string) { return db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).get(); }
  deleteSession(sessionId: string) { db.delete(sessions).where(eq(sessions.sessionId, sessionId)).run(); }
  deleteSessionsByUserId(userId: number) { db.delete(sessions).where(eq(sessions.userId, userId)).run(); }

  // ─── Categories ──────────────────────────────────────────────────────────────
  getCategories() { return db.select().from(categories).all(); }
  createCategory(data: InsertCategory) { return db.insert(categories).values(data).returning().get(); }
  updateCategory(id: number, data: Partial<InsertCategory>) { return db.update(categories).set(data).where(eq(categories.id, id)).returning().get(); }
  deleteCategory(id: number) { db.delete(categories).where(eq(categories.id, id)).run(); }

  // ─── Subcategories ───────────────────────────────────────────────────────────
  getSubcategoriesByCategory(categoryId: number) { return db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId)).all(); }
  createSubcategory(data: InsertSubcategory) { return db.insert(subcategories).values(data).returning().get(); }
  updateSubcategory(id: number, data: Partial<InsertSubcategory>) { return db.update(subcategories).set(data).where(eq(subcategories.id, id)).returning().get(); }
  deleteSubcategory(id: number) { db.delete(subcategories).where(eq(subcategories.id, id)).run(); }

  // ─── Device Models ───────────────────────────────────────────────────────────
  getDeviceModelsByCategory(categoryId: number) { return db.select().from(deviceModels).where(eq(deviceModels.categoryId, categoryId)).all(); }
  getDeviceModelsBySubcategory(subcategoryId: number) { return db.select().from(deviceModels).where(eq(deviceModels.subcategoryId, subcategoryId)).all(); }
  getAllDeviceModels() { return db.select().from(deviceModels).all(); }
  createDeviceModel(data: InsertDeviceModel) { return db.insert(deviceModels).values(data).returning().get(); }
  updateDeviceModel(id: number, data: Partial<InsertDeviceModel>) { return db.update(deviceModels).set(data).where(eq(deviceModels.id, id)).returning().get(); }
  deleteDeviceModel(id: number) { db.delete(deviceModels).where(eq(deviceModels.id, id)).run(); }

  // ─── Services ────────────────────────────────────────────────────────────────
  getServicesByModel(deviceModelId: number) { return db.select().from(services).where(eq(services.deviceModelId, deviceModelId)).all(); }
  createService(data: InsertService) { return db.insert(services).values(data).returning().get(); }
  updateService(id: number, data: Partial<InsertService>) { return db.update(services).set(data).where(eq(services.id, id)).returning().get(); }
  deleteService(id: number) { db.delete(services).where(eq(services.id, id)).run(); }

  // ─── Suppliers ───────────────────────────────────────────────────────────────
  getSuppliers() { return db.select().from(suppliers).all(); }
  createSupplier(data: InsertSupplier) { return db.insert(suppliers).values(data).returning().get(); }
  updateSupplier(id: number, data: Partial<InsertSupplier>) { return db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning().get(); }
  deleteSupplier(id: number) { db.delete(suppliers).where(eq(suppliers.id, id)).run(); }

  // ─── Change Requests ─────────────────────────────────────────────────────────
  getChangeRequests() { return db.select().from(changeRequests).all(); }
  getPendingChangeRequests() { return db.select().from(changeRequests).where(eq(changeRequests.status, "pending")).all(); }
  createChangeRequest(data: InsertChangeRequest) { return db.insert(changeRequests).values(data).returning().get(); }
  updateChangeRequestStatus(id: number, status: string, adminComment?: string) {
    const d: any = { status };
    if (adminComment !== undefined) d.adminComment = adminComment;
    return db.update(changeRequests).set(d).where(eq(changeRequests.id, id)).returning().get();
  }

  // ─── Orders (email) ──────────────────────────────────────────────────────────
  getOrders() { return db.select().from(orders).orderBy(desc(orders.createdAt)).all(); }
  getNewOrdersCount() { return db.select().from(orders).where(eq(orders.status, "новая")).all().length; }
  getOrderById(id: number) { return db.select().from(orders).where(eq(orders.id, id)).get(); }
  createOrder(data: InsertOrder) { return db.insert(orders).values(data).returning().get(); }
  orderExists(messageId: string) { return !!db.select().from(orders).where(eq(orders.messageId, messageId)).get(); }
  updateOrderStatus(id: number, status: string) { return db.update(orders).set({ status }).where(eq(orders.id, id)).returning().get(); }
  updateOrderCalled(id: number, called: boolean) { return db.update(orders).set({ called }).where(eq(orders.id, id)).returning().get(); }

  // ─── Clients ─────────────────────────────────────────────────────────────────
  getClients() { return db.select().from(clients).orderBy(desc(clients.createdAt)).all(); }
  getClientById(id: number) { return db.select().from(clients).where(eq(clients.id, id)).get(); }
  createClient(data: InsertClient) { return db.insert(clients).values(data).returning().get(); }
  updateClient(id: number, data: Partial<InsertClient>) { return db.update(clients).set(data).where(eq(clients.id, id)).returning().get(); }
  deleteClient(id: number) { db.delete(clients).where(eq(clients.id, id)).run(); }

  // ─── Repairs (manual CRM) ────────────────────────────────────────────────────
  getRepairs() { return db.select().from(repairs).orderBy(desc(repairs.createdAt)).all(); }
  getRepairById(id: number) { return db.select().from(repairs).where(eq(repairs.id, id)).get(); }
  getRepairsByClient(clientId: number) { return db.select().from(repairs).where(eq(repairs.clientId, clientId)).orderBy(desc(repairs.createdAt)).all(); }
  getNewRepairsCount() { return db.select().from(repairs).where(eq(repairs.status, "новая")).all().length; }
  createRepair(data: InsertRepair) { return db.insert(repairs).values(data).returning().get(); }
  updateRepair(id: number, data: Partial<InsertRepair>) { return db.update(repairs).set(data).where(eq(repairs.id, id)).returning().get(); }
  deleteRepair(id: number) { db.delete(repairs).where(eq(repairs.id, id)).run(); }

  // ─── Parts (склад) ───────────────────────────────────────────────────────────
  getParts() { return db.select().from(parts).orderBy(desc(parts.createdAt)).all(); }
  getPartById(id: number) { return db.select().from(parts).where(eq(parts.id, id)).get(); }
  createPart(data: InsertPart) { return db.insert(parts).values(data).returning().get(); }
  updatePart(id: number, data: Partial<InsertPart>) { return db.update(parts).set(data).where(eq(parts.id, id)).returning().get(); }
  deletePart(id: number) { db.delete(parts).where(eq(parts.id, id)).run(); }

  partIn(partId: number, quantity: number, price: number | null, comment: string | null) {
    const now = new Date().toISOString();
    const part = db.select().from(parts).where(eq(parts.id, partId)).get();
    if (!part) throw new Error("Part not found");
    db.update(parts).set({ quantity: part.quantity + quantity, updatedAt: now }).where(eq(parts.id, partId)).run();
    return db.insert(partMovements).values({ partId, type: "in", quantity, price, repairId: null, comment, createdAt: now }).returning().get();
  }

  partOut(partId: number, quantity: number, repairId: number | null, comment: string | null) {
    const now = new Date().toISOString();
    const part = db.select().from(parts).where(eq(parts.id, partId)).get();
    if (!part) throw new Error("Part not found");
    if (part.quantity < quantity) throw new Error("Not enough quantity");
    db.update(parts).set({ quantity: part.quantity - quantity, updatedAt: now }).where(eq(parts.id, partId)).run();
    return db.insert(partMovements).values({ partId, type: "out", quantity, price: null, repairId, comment, createdAt: now }).returning().get();
  }

  getPartMovements(partId: number) { return db.select().from(partMovements).where(eq(partMovements.partId, partId)).orderBy(desc(partMovements.createdAt)).all(); }

  // ─── Transactions (касса) ────────────────────────────────────────────────────
  getTransactions(filters?: { type?: string; dateFrom?: string; dateTo?: string }) {
    let q = db.select().from(transactions);
    const rows = q.orderBy(desc(transactions.date)).all();
    if (!filters) return rows;
    return rows.filter(r => {
      if (filters.type && r.type !== filters.type) return false;
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      return true;
    });
  }
  getTransactionById(id: number) { return db.select().from(transactions).where(eq(transactions.id, id)).get(); }
  createTransaction(data: InsertTransaction) { return db.insert(transactions).values(data).returning().get(); }
  deleteTransaction(id: number) { db.delete(transactions).where(eq(transactions.id, id)).run(); }

  // ─── Salaries (зарплата мастеров) ────────────────────────────────────────────
  getSalaries(filters?: { masterId?: number; period?: string; paid?: boolean }) {
    const rows = db.select().from(salaries).orderBy(desc(salaries.date)).all();
    if (!filters) return rows;
    return rows.filter(r => {
      if (filters.masterId !== undefined && r.masterId !== filters.masterId) return false;
      if (filters.period && r.period !== filters.period) return false;
      if (filters.paid !== undefined && r.paid !== filters.paid) return false;
      return true;
    });
  }
  getSalaryById(id: number) { return db.select().from(salaries).where(eq(salaries.id, id)).get(); }
  createSalary(data: InsertSalary) { return db.insert(salaries).values(data).returning().get(); }
  updateSalaryPaid(id: number, paid: boolean) { return db.update(salaries).set({ paid }).where(eq(salaries.id, id)).returning().get(); }
  deleteSalary(id: number) { db.delete(salaries).where(eq(salaries.id, id)).run(); }

  // Итоги по зарплате мастера за период
  getSalaryTotals(masterId: number, period: string) {
    const rows = db.select().from(salaries)
      .where(and(eq(salaries.masterId, masterId), eq(salaries.period, period)))
      .all();
    const total = rows.reduce((sum, r) => {
      if (r.type === "penalty") return sum - r.amount;
      return sum + r.amount;
    }, 0);
    const paid = rows.filter(r => r.paid).reduce((sum, r) => {
      if (r.type === "penalty") return sum - r.amount;
      return sum + r.amount;
    }, 0);
    return { total, paid, debt: total - paid, rows };
  }
}

export const storage = new SQLiteStorage();
