import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("master"), // "admin" | "master"
  displayName: text("display_name").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Smartphone"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// ─── Subcategories ────────────────────────────────────────────────────────────
export const subcategories = sqliteTable("subcategories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertSubcategorySchema = createInsertSchema(subcategories).omit({ id: true });
export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;

// ─── Device Models ────────────────────────────────────────────────────────────
export const deviceModels = sqliteTable("device_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull(),
  subcategoryId: integer("subcategory_id"), // null = без подкатегории
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertDeviceModelSchema = createInsertSchema(deviceModels).omit({ id: true });
export type InsertDeviceModel = z.infer<typeof insertDeviceModelSchema>;
export type DeviceModel = typeof deviceModels.$inferSelect;

// ─── Services ─────────────────────────────────────────────────────────────────
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceModelId: integer("device_model_id").notNull(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  priceMax: real("price_max"), // optional upper bound for ranges
  duration: text("duration"), // e.g. "30 мин"
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("supplier"), // "supplier" | "outsourcer"
  contact: text("contact"),
  phone: text("phone"),
  website: text("website"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── Repairs (полная карточка ремонта) ────────────────────────────────────────
export const repairs = sqliteTable("repairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Клиент
  clientId: integer("client_id"),           // привязка к клиенту (опционально)
  clientName: text("client_name"),
  phone: text("phone"),
  // Устройство
  deviceType: text("device_type"),          // Телефон, Планшет, Ноутбук...
  brand: text("brand"),
  model: text("model"),
  imei: text("imei"),
  appearance: text("appearance"),           // внешний вид при приёмке
  issue: text("issue"),                     // неисправность
  // Финансы
  estimatedPrice: real("estimated_price"),  // предварительная стоимость
  finalPrice: real("final_price"),          // итоговая стоимость
  prepayment: real("prepayment"),           // предоплата
  // Сроки и гарантия
  deadline: text("deadline"),              // срок выдачи
  warranty: text("warranty"),              // гарантия (например "30 дней")
  // Работа
  masterId: integer("master_id"),          // назначенный мастер
  masterComment: text("master_comment"),   // комментарий мастера
  // Статус
  status: text("status").notNull().default("новая"),
  // новая | в_работе | готово | отказ | записал
  called: integer("called", { mode: "boolean" }).notNull().default(false),
  // Источник
  source: text("source").notNull().default("manual"), // manual | email
  messageId: text("message_id"),           // если из почты — уникальный id письма
  sourceUrl: text("source_url"),
  discount: text("discount"),
  rawText: text("raw_text"),
  location: text("location"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertRepairSchema = createInsertSchema(repairs).omit({ id: true });
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairs.$inferSelect;

// Оставляем orders как алиас для обратной совместимости (старые письма)
export const orders = repairs;
export const insertOrderSchema = insertRepairSchema;
export type InsertOrder = InsertRepair;
export type Order = Repair;

// ─── Parts (Склад запчастей) ─────────────────────────────────────────────────
export const parts = sqliteTable("parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),                  // название запчасти
  sku: text("sku"),                              // артикул
  category: text("category"),                   // категория: дисплеи, аккумуляторы...
  quantity: integer("quantity").notNull().default(0), // остаток на складе
  minQuantity: integer("min_quantity").default(1),    // минимальный остаток (для уведомления)
  buyPrice: real("buy_price"),                  // цена закупки
  sellPrice: real("sell_price"),                // цена продажи/установки
  supplierId: integer("supplier_id"),           // поставщик
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPartSchema = createInsertSchema(parts).omit({ id: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof parts.$inferSelect;

// ─── Part Movements (Приход/Расход) ───────────────────────────────────────────
export const partMovements = sqliteTable("part_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull(),
  type: text("type").notNull(),    // "in" | "out"
  quantity: integer("quantity").notNull(),
  price: real("price"),            // цена за единицу при этом движении
  repairId: integer("repair_id"), // если расход — привязан к заявке
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});

export const insertPartMovementSchema = createInsertSchema(partMovements).omit({ id: true });
export type InsertPartMovement = z.infer<typeof insertPartMovementSchema>;
export type PartMovement = typeof partMovements.$inferSelect;

// ─── Transactions (Касса) ──────────────────────────────────────────────────
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),        // "income" | "expense"
  amount: real("amount").notNull(),
  category: text("category").notNull(), // Ремонт, Закупка, Аренда...
  description: text("description"),
  repairId: integer("repair_id"),       // если связано с заявкой
  paymentMethod: text("payment_method").default("cash"), // cash | card | transfer
  createdAt: text("created_at").notNull(),
  date: text("date").notNull(),          // дата операции YYYY-MM-DD
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ─── Change Requests ──────────────────────────────────────────────────────────
export const changeRequests = sqliteTable("change_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "price_change" | "new_service" | "new_model" | "new_category"
  description: text("description").notNull(),
  targetId: integer("target_id"), // optional: existing entity id
  targetType: text("target_type"), // "service" | "model" | "category"
  proposedValue: text("proposed_value"), // JSON string
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  adminComment: text("admin_comment"),
  createdAt: text("created_at").notNull(),
});

export const insertChangeRequestSchema = createInsertSchema(changeRequests).omit({
  id: true,
  status: true,
  adminComment: true,
});
export type InsertChangeRequest = z.infer<typeof insertChangeRequestSchema>;
export type ChangeRequest = typeof changeRequests.$inferSelect;

// ─── Sessions ─────────────────────────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  userId: integer("user_id").notNull().unique(), // one session per user
  sessionId: text("session_id").notNull(),
  createdAt: text("created_at").notNull(),
});
export type Session = typeof sessions.$inferSelect;

// ─── Salaries ────────────────────────────────────────────────────────────────
export const salaries = sqliteTable("salaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  masterId: integer("master_id").notNull(),
  masterName: text("master_name").notNull(),
  type: text("type").notNull().default("salary"), // "salary" | "bonus" | "penalty"
  amount: real("amount").notNull(),
  description: text("description"),
  repairId: integer("repair_id"),
  period: text("period"),
  paymentMethod: text("payment_method").default("cash"),
  paid: integer("paid").notNull().default(0), // 0 | 1
  createdAt: text("created_at").notNull(),
  date: text("date").notNull(),
});

export const insertSalarySchema = createInsertSchema(salaries).omit({ id: true });
export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salaries.$inferSelect;

// ─── Repair Statuses (управляемые через админку) ─────────────────────────────
export const repairStatuses = sqliteTable("repair_statuses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),       // "новая", "в_работе" и т.д.
  label: text("label").notNull(),            // "Новая", "В работе"
  color: text("color").notNull().default("bg-gray-500 text-white"),
  scope: text("scope").notNull().default("both"), // "orders" | "email" | "both"
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertRepairStatusSchema = createInsertSchema(repairStatuses).omit({ id: true });
export type InsertRepairStatus = z.infer<typeof insertRepairStatusSchema>;
export type RepairStatus = typeof repairStatuses.$inferSelect;

// ─── Device Brands & Models ───────────────────────────────────────────────────
export const deviceBrands = sqliteTable("device_brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertDeviceBrandSchema = createInsertSchema(deviceBrands).omit({ id: true });
export type InsertDeviceBrand = z.infer<typeof insertDeviceBrandSchema>;
export type DeviceBrand = typeof deviceBrands.$inferSelect;

export const deviceModelsRepair = sqliteTable("device_models_repair", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brandId: integer("brand_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertDeviceModelRepairSchema = createInsertSchema(deviceModelsRepair).omit({ id: true });
export type InsertDeviceModelRepair = z.infer<typeof insertDeviceModelRepairSchema>;
export type DeviceModelRepair = typeof deviceModelsRepair.$inferSelect;

// ─── Repair Issues (неисправности) ───────────────────────────────────────────
export const repairIssues = sqliteTable("repair_issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertRepairIssueSchema = createInsertSchema(repairIssues).omit({ id: true });
export type InsertRepairIssue = z.infer<typeof insertRepairIssueSchema>;
export type RepairIssue = typeof repairIssues.$inferSelect;


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


// ─── Part ↔ Device Models (many-to-many) ─────────────────────────────────────
// Одна запчасть может подходить нескольким моделям устройств
export const partDeviceModels = sqliteTable("part_device_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull(),
  deviceModelId: integer("device_model_id").notNull(), // ссылка на device_models_repair
});
export type PartDeviceModel = typeof partDeviceModels.$inferSelect;

// ─── Part Categories (управляемые категории склада) ───────────────────────────
export const partCategories = sqliteTable("part_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertPartCategorySchema = createInsertSchema(partCategories).omit({ id: true });
export type InsertPartCategory = z.infer<typeof insertPartCategorySchema>;
export type PartCategory = typeof partCategories.$inferSelect;

// ─── Cashboxes (кассы) ────────────────────────────────────────────────────────
export const cashboxes = sqliteTable("cashboxes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),                              // "Наличные", "Терминал"
  type: text("type").notNull().default("cash"),             // cash | card | transfer | custom
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertCashboxSchema = createInsertSchema(cashboxes).omit({ id: true });
export type InsertCashbox = z.infer<typeof insertCashboxSchema>;
export type Cashbox = typeof cashboxes.$inferSelect;
