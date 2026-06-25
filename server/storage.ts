import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import {
  users, categories, subcategories, deviceModels, services, suppliers, changeRequests, repairs, sessions, clients,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Subcategory, type InsertSubcategory,
  type DeviceModel, type InsertDeviceModel,
  type Service, type InsertService,
  type Supplier, type InsertSupplier,
  type ChangeRequest, type InsertChangeRequest,
  type Repair, type InsertRepair,
  type Client, type InsertClient,
  type Session,
} from "@shared/schema";
import bcrypt from "bcryptjs";

// На Railway база хранится в /data (persistent volume), локально — в корне проекта
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
  CREATE TABLE IF NOT EXISTS sessions (
    user_id INTEGER NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    client_name TEXT,
    phone TEXT,
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
`);

// Seed default data if empty
function seedIfEmpty() {
  const existingUsers = db.select().from(users).all();
  if (existingUsers.length > 0) return;

  // Admin user
  const adminHash = bcrypt.hashSync("admin123", 12);
  db.insert(users).values({ username: "admin", passwordHash: adminHash, role: "admin", displayName: "Администратор" }).run();
  const masterHash = bcrypt.hashSync("master123", 12);
  db.insert(users).values({ username: "master1", passwordHash: masterHash, role: "master", displayName: "Мастер Иван" }).run();

  // Categories
  db.insert(categories).values({ name: "iPhone", icon: "Smartphone", sortOrder: 1 }).run();
  db.insert(categories).values({ name: "Android", icon: "Phone", sortOrder: 2 }).run();
  db.insert(categories).values({ name: "Игровые приставки", icon: "Gamepad2", sortOrder: 3 }).run();

  const cat1 = db.select().from(categories).all()[0];

  // iPhone models
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

  // Services for each iPhone model
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
      // Adjust price slightly per model generation (newer = slightly higher)
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

  // Sample suppliers
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

// ─── Storage Interface ────────────────────────────────────────────────────────
export interface IStorage {
  // Auth
  getAllUsers(): User[];
  getUserByUsername(username: string): User | undefined;
  getUserById(id: number): User | undefined;
  createUser(data: InsertUser): User;
  updateUser(id: number, data: Partial<InsertUser>): User | undefined;
  deleteUser(id: number): void;

  // Categories
  getCategories(): Category[];
  createCategory(data: InsertCategory): Category;
  updateCategory(id: number, data: Partial<InsertCategory>): Category | undefined;
  deleteCategory(id: number): void;

  // Subcategories
  getSubcategoriesByCategory(categoryId: number): Subcategory[];
  createSubcategory(data: InsertSubcategory): Subcategory;
  updateSubcategory(id: number, data: Partial<InsertSubcategory>): Subcategory | undefined;
  deleteSubcategory(id: number): void;

  // Device Models
  getDeviceModelsByCategory(categoryId: number): DeviceModel[];
  getDeviceModelsBySubcategory(subcategoryId: number): DeviceModel[];
  getAllDeviceModels(): DeviceModel[];
  createDeviceModel(data: InsertDeviceModel): DeviceModel;
  updateDeviceModel(id: number, data: Partial<InsertDeviceModel>): DeviceModel | undefined;
  deleteDeviceModel(id: number): void;

  // Services
  getServicesByModel(deviceModelId: number): Service[];
  createService(data: InsertService): Service;
  updateService(id: number, data: Partial<InsertService>): Service | undefined;
  deleteService(id: number): void;

  // Suppliers
  getSuppliers(): Supplier[];
  createSupplier(data: InsertSupplier): Supplier;
  updateSupplier(id: number, data: Partial<InsertSupplier>): Supplier | undefined;
  deleteSupplier(id: number): void;

  // Change Requests
  getChangeRequests(): ChangeRequest[];
  getPendingChangeRequests(): ChangeRequest[];
  createChangeRequest(data: InsertChangeRequest): ChangeRequest;
  updateChangeRequestStatus(id: number, status: string, adminComment?: string): ChangeRequest | undefined;

  // Sessions
  upsertSession(userId: number, sessionId: string): void;
  getSession(userId: number): Session | undefined;
  deleteSession(userId: number): void;

  // Clients
  getClients(): Client[];
  searchClients(query: string): Client[];
  getClientById(id: number): Client | undefined;
  getClientByPhone(phone: string): Client | undefined;
  createClient(data: InsertClient): Client;
  updateClient(id: number, data: Partial<InsertClient>): Client | undefined;
  deleteClient(id: number): void;

  // Repairs (полные карточки ремонта)
  getRepairs(): Repair[];
  getNewRepairsCount(): number;
  getRepairById(id: number): Repair | undefined;
  getRepairsByClient(clientId: number): Repair[];
  createRepair(data: InsertRepair): Repair;
  updateRepair(id: number, data: Partial<InsertRepair>): Repair | undefined;
  repairExists(messageId: string): boolean;

  // Orders (алиас для совместимости с emailPoller)
  getOrders(): Repair[];
  getNewOrdersCount(): number;
  getOrderById(id: number): Repair | undefined;
  createOrder(data: InsertRepair): Repair;
  orderExists(messageId: string): boolean;
  updateOrderStatus(id: number, status: string): Repair | undefined;
  updateOrderCalled(id: number, called: boolean): Repair | undefined;
}

export class SQLiteStorage implements IStorage {
  getAllUsers() {
    return db.select().from(users).all();
  }
  getUserByUsername(username: string) {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  getUserById(id: number) {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  createUser(data: InsertUser) {
    return db.insert(users).values(data).returning().get();
  }
  updateUser(id: number, data: Partial<InsertUser>) {
    return db.update(users).set(data).where(eq(users.id, id)).returning().get();
  }
  deleteUser(id: number) {
    db.delete(users).where(eq(users.id, id)).run();
  }

  getCategories() {
    return db.select().from(categories).all();
  }
  createCategory(data: InsertCategory) {
    return db.insert(categories).values(data).returning().get();
  }
  updateCategory(id: number, data: Partial<InsertCategory>) {
    return db.update(categories).set(data).where(eq(categories.id, id)).returning().get();
  }
  deleteCategory(id: number) {
    db.delete(categories).where(eq(categories.id, id)).run();
  }

  getSubcategoriesByCategory(categoryId: number) {
    return db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId)).all();
  }
  createSubcategory(data: InsertSubcategory) {
    return db.insert(subcategories).values(data).returning().get();
  }
  updateSubcategory(id: number, data: Partial<InsertSubcategory>) {
    return db.update(subcategories).set(data).where(eq(subcategories.id, id)).returning().get();
  }
  deleteSubcategory(id: number) {
    db.delete(subcategories).where(eq(subcategories.id, id)).run();
  }

  getDeviceModelsByCategory(categoryId: number) {
    return db.select().from(deviceModels).where(eq(deviceModels.categoryId, categoryId)).all();
  }
  getDeviceModelsBySubcategory(subcategoryId: number) {
    return db.select().from(deviceModels).where(eq(deviceModels.subcategoryId, subcategoryId)).all();
  }
  getAllDeviceModels() {
    return db.select().from(deviceModels).all();
  }
  createDeviceModel(data: InsertDeviceModel) {
    return db.insert(deviceModels).values(data).returning().get();
  }
  updateDeviceModel(id: number, data: Partial<InsertDeviceModel>) {
    return db.update(deviceModels).set(data).where(eq(deviceModels.id, id)).returning().get();
  }
  deleteDeviceModel(id: number) {
    db.delete(deviceModels).where(eq(deviceModels.id, id)).run();
  }

  getServicesByModel(deviceModelId: number) {
    return db.select().from(services).where(eq(services.deviceModelId, deviceModelId)).all();
  }
  createService(data: InsertService) {
    return db.insert(services).values(data).returning().get();
  }
  updateService(id: number, data: Partial<InsertService>) {
    return db.update(services).set(data).where(eq(services.id, id)).returning().get();
  }
  deleteService(id: number) {
    db.delete(services).where(eq(services.id, id)).run();
  }

  getSuppliers() {
    return db.select().from(suppliers).all();
  }
  createSupplier(data: InsertSupplier) {
    return db.insert(suppliers).values(data).returning().get();
  }
  updateSupplier(id: number, data: Partial<InsertSupplier>) {
    return db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning().get();
  }
  deleteSupplier(id: number) {
    db.delete(suppliers).where(eq(suppliers.id, id)).run();
  }

  getChangeRequests() {
    return db.select().from(changeRequests).all();
  }
  getPendingChangeRequests() {
    return db.select().from(changeRequests).where(eq(changeRequests.status, "pending")).all();
  }
  createChangeRequest(data: InsertChangeRequest) {
    return db.insert(changeRequests).values(data).returning().get();
  }
  updateChangeRequestStatus(id: number, status: string, adminComment?: string) {
    const updateData: any = { status };
    if (adminComment !== undefined) updateData.adminComment = adminComment;
    return db.update(changeRequests).set(updateData).where(eq(changeRequests.id, id)).returning().get();
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────────
  upsertSession(userId: number, sessionId: string) {
    sqlite.prepare(
      `INSERT INTO sessions (user_id, session_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET session_id = excluded.session_id, created_at = excluded.created_at`
    ).run(userId, sessionId, new Date().toISOString());
  }
  getSession(userId: number) {
    return db.select().from(sessions).where(eq(sessions.userId, userId)).get();
  }
  deleteSession(userId: number) {
    db.delete(sessions).where(eq(sessions.userId, userId)).run();
  }

  // ─── Clients ──────────────────────────────────────────────────────────────────
  getClients() {
    return db.select().from(clients).orderBy(desc(clients.createdAt)).all();
  }
  searchClients(query: string) {
    const q = query.toLowerCase();
    return db.select().from(clients).all().filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || "").toLowerCase().includes(q)
    );
  }
  getClientById(id: number) {
    return db.select().from(clients).where(eq(clients.id, id)).get();
  }
  getClientByPhone(phone: string) {
    // нормализуем: убираем всё кроме цифр
    const digits = phone.replace(/\D/g, "");
    return db.select().from(clients).all().find(c => c.phone.replace(/\D/g, "") === digits);
  }
  createClient(data: InsertClient) {
    return db.insert(clients).values(data).returning().get();
  }
  updateClient(id: number, data: Partial<InsertClient>) {
    return db.update(clients).set(data).where(eq(clients.id, id)).returning().get();
  }
  deleteClient(id: number) {
    db.delete(clients).where(eq(clients.id, id)).run();
  }

  // ─── Repairs ──────────────────────────────────────────────────────────────────
  getRepairs() {
    return db.select().from(repairs).orderBy(desc(repairs.createdAt)).all();
  }
  getNewRepairsCount() {
    return db.select().from(repairs).where(eq(repairs.status, "новая")).all().length;
  }
  getRepairById(id: number) {
    return db.select().from(repairs).where(eq(repairs.id, id)).get();
  }
  getRepairsByClient(clientId: number) {
    return db.select().from(repairs).where(eq(repairs.clientId, clientId)).orderBy(desc(repairs.createdAt)).all();
  }
  createRepair(data: InsertRepair) {
    return db.insert(repairs).values(data).returning().get();
  }
  updateRepair(id: number, data: Partial<InsertRepair>) {
    return db.update(repairs).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(repairs.id, id)).returning().get();
  }
  repairExists(messageId: string) {
    const row = db.select().from(repairs).where(eq(repairs.messageId, messageId)).get();
    return !!row;
  }

  // Orders — алиасы для обратной совместимости с emailPoller
  getOrders() { return this.getRepairs(); }
  getNewOrdersCount() { return this.getNewRepairsCount(); }
  getOrderById(id: number) { return this.getRepairById(id); }
  createOrder(data: InsertRepair) { return this.createRepair(data); }
  orderExists(messageId: string) { return this.repairExists(messageId); }
  updateOrderStatus(id: number, status: string) {
    return this.updateRepair(id, { status });
  }
  updateOrderCalled(id: number, called: boolean) {
    return this.updateRepair(id, { called });
  }
}

export const storage = new SQLiteStorage();
