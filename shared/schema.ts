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

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  sessionId: text("session_id").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

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
  subcategoryId: integer("subcategory_id"),
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
  priceMax: real("price_max"),
  duration: text("duration"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("supplier"),
  contact: text("contact"),
  phone: text("phone"),
  website: text("website"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ─── Orders (email quiz leads) ────────────────────────────────────────────────
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: text("message_id").notNull().unique(),
  clientName: text("client_name"),
  phone: text("phone"),
  discount: text("discount"),
  device: text("device"),
  brand: text("brand"),
  issue: text("issue"),
  location: text("location"),
  sourceUrl: text("source_url"),
  rawText: text("raw_text"),
  status: text("status").notNull().default("новая"),
  called: integer("called", { mode: "boolean" }).notNull().default(false),
  assignedTo: integer("assigned_to"),
  createdAt: text("created_at").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ─── Change Requests ──────────────────────────────────────────────────────────
export const changeRequests = sqliteTable("change_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  targetId: integer("target_id"),
  targetType: text("target_type"),
  proposedValue: text("proposed_value"),
  status: text("status").notNull().default("pending"),
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

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── Repairs (manual orders / CRM) ───────────────────────────────────────────
export const repairs = sqliteTable("repairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id"),
  clientName: text("client_name"),
  phone: text("phone"),
  email: text("email"),
  deviceType: text("device_type"),
  brand: text("brand"),
  model: text("model"),
  imei: text("imei"),
  appearance: text("appearance"),
  issue: text("issue"),
  estimatedPrice: real("estimated_price"),
  finalPrice: real("final_price"),
  prepayment: real("prepayment"),
  deadline: text("deadline"),
  warranty: text("warranty"),
  masterId: integer("master_id"),
  masterComment: text("master_comment"),
  status: text("status").notNull().default("новая"),
  called: integer("called", { mode: "boolean" }).notNull().default(false),
  source: text("source").notNull().default("manual"),
  messageId: text("message_id"),
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

// ─── Parts (склад запчастей) ──────────────────────────────────────────────────
export const parts = sqliteTable("parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category"),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(1),
  buyPrice: real("buy_price"),
  sellPrice: real("sell_price"),
  supplierId: integer("supplier_id"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPartSchema = createInsertSchema(parts).omit({ id: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof parts.$inferSelect;

// ─── Part Movements (движения склада) ────────────────────────────────────────
export const partMovements = sqliteTable("part_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull(),
  type: text("type").notNull(), // "in" | "out"
  quantity: integer("quantity").notNull(),
  price: real("price"),
  repairId: integer("repair_id"),
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});

export const insertPartMovementSchema = createInsertSchema(partMovements).omit({ id: true });
export type InsertPartMovement = z.infer<typeof insertPartMovementSchema>;
export type PartMovement = typeof partMovements.$inferSelect;

// ─── Transactions (касса) ─────────────────────────────────────────────────────
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // "income" | "expense"
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  repairId: integer("repair_id"),
  paymentMethod: text("payment_method").notNull().default("cash"), // "cash" | "card" | "transfer"
  createdAt: text("created_at").notNull(),
  date: text("date").notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ─── Salaries (зарплата мастеров) ────────────────────────────────────────────
export const salaries = sqliteTable("salaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  masterId: integer("master_id").notNull(),
  masterName: text("master_name").notNull(),
  type: text("type").notNull(), // "salary" | "bonus" | "penalty"
  amount: real("amount").notNull(),
  description: text("description"),
  repairId: integer("repair_id"),
  period: text("period").notNull(), // "2024-06" — месяц
  paymentMethod: text("payment_method").notNull().default("cash"),
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  date: text("date").notNull(),
});

export const insertSalarySchema = createInsertSchema(salaries).omit({ id: true });
export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salaries.$inferSelect;
