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
