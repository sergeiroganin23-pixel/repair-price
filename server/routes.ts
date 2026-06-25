import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "repair_jwt_secret_change_in_prod_2024!";

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Слишком много попыток входа. Подождите 15 минут." }, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, message: { error: "Слишком много запросов." } });

interface AuthRequest extends Request {
  user?: { id: number; role: string; displayName: string; sessionId?: string };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"];
  const token = auth && auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Требуется авторизация" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Validate session
    if (payload.sessionId) {
      const session = storage.getSessionBySessionId(payload.sessionId);
      if (!session) return res.status(401).json({ error: "Сессия завершена" });
    }
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ error: "Токен недействителен или истёк" });
  }
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Доступ только для администратора" });
  next();
}

export function registerRoutes(httpServer: Server, app: Express) {
  app.use("/api", apiLimiter);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", loginLimiter, (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Введите логин и пароль" });
    if (typeof username !== "string" || username.length > 64) return res.status(400).json({ error: "Неверный формат логина" });
    const user = storage.getUserByUsername(username.trim().toLowerCase());
    if (!user) return res.status(401).json({ error: "Неверный логин или пароль" });
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Неверный логин или пароль" });
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    storage.createSession(user.id, sessionId);
    const token = jwt.sign({ id: user.id, role: user.role, displayName: user.displayName, sessionId }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, role: user.role, displayName: user.displayName });
  });

  app.post("/api/auth/logout", authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user?.sessionId) storage.deleteSession(req.user.sessionId);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(req.user);
  });

  // ─── Categories ────────────────────────────────────────────────────────────
  app.get("/api/categories", (req, res) => res.json(storage.getCategories()));

  app.post("/api/categories", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { name, icon, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Название категории обязательно" });
    res.json(storage.createCategory({ name, icon: icon || "Smartphone", sortOrder: sortOrder ?? 0 }));
  });

  app.put("/api/categories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const result = storage.updateCategory(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Категория не найдена" });
    res.json(result);
  });

  app.delete("/api/categories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteCategory(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Subcategories ─────────────────────────────────────────────────────────
  app.get("/api/subcategories", (req, res) => {
    const catId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
    if (!catId) return res.status(400).json({ error: "categoryId обязателен" });
    res.json(storage.getSubcategoriesByCategory(catId));
  });

  app.post("/api/subcategories", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { categoryId, name, sortOrder } = req.body;
    if (!categoryId || !name) return res.status(400).json({ error: "Категория и название обязательны" });
    res.json(storage.createSubcategory({ categoryId, name, sortOrder: sortOrder ?? 0 }));
  });

  app.put("/api/subcategories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const result = storage.updateSubcategory(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Подкатегория не найдена" });
    res.json(result);
  });

  app.delete("/api/subcategories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteSubcategory(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Device Models ─────────────────────────────────────────────────────────
  app.get("/api/models", (req, res) => {
    const catId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
    const subId = req.query.subcategoryId ? parseInt(req.query.subcategoryId as string) : null;
    if (subId) return res.json(storage.getDeviceModelsBySubcategory(subId));
    if (catId) return res.json(storage.getDeviceModelsByCategory(catId));
    res.json(storage.getAllDeviceModels());
  });

  app.post("/api/models", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { categoryId, subcategoryId, name, sortOrder } = req.body;
    if (!categoryId || !name) return res.status(400).json({ error: "Категория и название обязательны" });
    res.json(storage.createDeviceModel({ categoryId, subcategoryId: subcategoryId ?? null, name, sortOrder: sortOrder ?? 0 }));
  });

  app.put("/api/models/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const result = storage.updateDeviceModel(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Модель не найдена" });
    res.json(result);
  });

  app.delete("/api/models/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteDeviceModel(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Services ──────────────────────────────────────────────────────────────
  app.get("/api/services", (req, res) => {
    const modelId = req.query.modelId ? parseInt(req.query.modelId as string) : null;
    if (!modelId) return res.status(400).json({ error: "Укажите modelId" });
    res.json(storage.getServicesByModel(modelId));
  });

  app.post("/api/services", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { deviceModelId, name, price, priceMax, duration, sortOrder } = req.body;
    if (!deviceModelId || !name || price === undefined) return res.status(400).json({ error: "Обязательные поля: deviceModelId, name, price" });
    res.json(storage.createService({ deviceModelId, name, price, priceMax: priceMax || null, duration: duration || null, sortOrder: sortOrder ?? 0 }));
  });

  app.put("/api/services/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const result = storage.updateService(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Услуга не найдена" });
    res.json(result);
  });

  app.delete("/api/services/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteService(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  app.get("/api/suppliers", (req, res) => res.json(storage.getSuppliers()));

  app.post("/api/suppliers", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { name, type, contact, phone, website, notes, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Название обязательно" });
    res.json(storage.createSupplier({ name, type: type || "supplier", contact: contact || null, phone: phone || null, website: website || null, notes: notes || null, sortOrder: sortOrder ?? 0 }));
  });

  app.put("/api/suppliers/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const result = storage.updateSupplier(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Поставщик не найден" });
    res.json(result);
  });

  app.delete("/api/suppliers/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteSupplier(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Change Requests ───────────────────────────────────────────────────────
  app.get("/api/requests", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(req.user?.role === "admin" ? storage.getChangeRequests() : storage.getPendingChangeRequests());
  });

  app.post("/api/requests", authenticateToken, (req: AuthRequest, res: Response) => {
    const { type, description, targetId, targetType, proposedValue } = req.body;
    if (!type || !description) return res.status(400).json({ error: "Тип и описание обязательны" });
    res.json(storage.createChangeRequest({ userId: req.user!.id, type, description, targetId: targetId || null, targetType: targetType || null, proposedValue: proposedValue ? JSON.stringify(proposedValue) : null, createdAt: new Date().toISOString() }));
  });

  app.put("/api/requests/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { status, adminComment } = req.body;
    if (!status) return res.status(400).json({ error: "Статус обязателен" });
    const result = storage.updateChangeRequestStatus(parseInt(req.params.id), status, adminComment);
    if (!result) return res.status(404).json({ error: "Запрос не найден" });
    res.json(result);
  });

  // ─── Admin: Users ──────────────────────────────────────────────────────────
  app.get("/api/admin/users", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    res.json(storage.getAllUsers().map(u => ({ id: u.id, username: u.username, role: u.role, displayName: u.displayName })));
  });

  app.post("/api/admin/users", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { username, password, role, displayName } = req.body;
    if (!username || !password || !displayName) return res.status(400).json({ error: "Логин, пароль и имя обязательны" });
    if (password.length < 6) return res.status(400).json({ error: "Пароль минимум 6 символов" });
    if (storage.getUserByUsername(username)) return res.status(409).json({ error: "Пользователь с таким логином уже существует" });
    const user = storage.createUser({ username: username.toLowerCase(), passwordHash: bcrypt.hashSync(password, 12), role: role || "master", displayName });
    res.json({ id: user.id, username: user.username, role: user.role, displayName: user.displayName });
  });

  app.put("/api/admin/users/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const { displayName, role, password } = req.body;
    const updates: any = {};
    if (displayName) updates.displayName = displayName;
    if (role) updates.role = role;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: "Пароль минимум 6 символов" });
      updates.passwordHash = bcrypt.hashSync(password, 12);
    }
    const result = storage.updateUser(id, updates);
    if (!result) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ id: result.id, username: result.username, role: result.role, displayName: result.displayName });
  });

  app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    if (req.user?.id === id) return res.status(400).json({ error: "Нельзя удалить себя" });
    storage.deleteUser(id);
    res.json({ ok: true });
  });

  // ─── Orders (email) ────────────────────────────────────────────────────────
  app.get("/api/orders", authenticateToken, (req: AuthRequest, res: Response) => res.json(storage.getOrders()));
  app.get("/api/orders/new-count", authenticateToken, (req: AuthRequest, res: Response) => res.json({ count: storage.getNewOrdersCount() }));

  app.put("/api/orders/:id/status", authenticateToken, (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    const valid = ["новая", "в_работе", "готово", "отказ", "записал"];
    if (!status || !valid.includes(status)) return res.status(400).json({ error: "Недопустимый статус" });
    const result = storage.updateOrderStatus(parseInt(req.params.id), status);
    if (!result) return res.status(404).json({ error: "Заявка не найдена" });
    res.json(result);
  });

  app.put("/api/orders/:id/called", authenticateToken, (req: AuthRequest, res: Response) => {
    const { called } = req.body;
    if (typeof called !== "boolean") return res.status(400).json({ error: "called должен быть boolean" });
    const result = storage.updateOrderCalled(parseInt(req.params.id), called);
    if (!result) return res.status(404).json({ error: "Заявка не найдена" });
    res.json(result);
  });

  // ─── Clients ───────────────────────────────────────────────────────────────
  app.get("/api/clients", authenticateToken, (req: AuthRequest, res: Response) => res.json(storage.getClients()));

  app.post("/api/clients", authenticateToken, (req: AuthRequest, res: Response) => {
    const { name, phone, email, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Имя клиента обязательно" });
    res.json(storage.createClient({ name, phone: phone || null, email: email || null, notes: notes || null, createdAt: new Date().toISOString() }));
  });

  app.put("/api/clients/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    const result = storage.updateClient(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Клиент не найден" });
    res.json(result);
  });

  app.delete("/api/clients/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteClient(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Repairs (manual CRM) ──────────────────────────────────────────────────
  app.get("/api/repairs", authenticateToken, (req: AuthRequest, res: Response) => res.json(storage.getRepairs()));
  app.get("/api/repairs/new-count", authenticateToken, (req: AuthRequest, res: Response) => res.json({ count: storage.getNewRepairsCount() }));

  app.get("/api/repairs/by-client/:clientId", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getRepairsByClient(parseInt(req.params.clientId)));
  });

  app.post("/api/repairs", authenticateToken, (req: AuthRequest, res: Response) => {
    const now = new Date().toISOString();
    const data = { ...req.body, createdAt: now, updatedAt: now, source: req.body.source || "manual" };
    if (!data.clientName && !data.clientId) return res.status(400).json({ error: "Имя клиента обязательно" });
    res.json(storage.createRepair(data));
  });

  app.put("/api/repairs/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    const data = { ...req.body, updatedAt: new Date().toISOString() };
    const result = storage.updateRepair(parseInt(req.params.id), data);
    if (!result) return res.status(404).json({ error: "Ремонт не найден" });
    res.json(result);
  });

  app.delete("/api/repairs/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteRepair(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Parts (склад) ─────────────────────────────────────────────────────────
  app.get("/api/parts", authenticateToken, (req: AuthRequest, res: Response) => res.json(storage.getParts()));

  app.post("/api/parts", authenticateToken, (req: AuthRequest, res: Response) => {
    const now = new Date().toISOString();
    const { name, sku, category, quantity, minQuantity, buyPrice, sellPrice, supplierId, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Название запчасти обязательно" });
    res.json(storage.createPart({ name, sku: sku || null, category: category || null, quantity: quantity ?? 0, minQuantity: minQuantity ?? 1, buyPrice: buyPrice || null, sellPrice: sellPrice || null, supplierId: supplierId || null, notes: notes || null, createdAt: now, updatedAt: now }));
  });

  app.put("/api/parts/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    const result = storage.updatePart(parseInt(req.params.id), { ...req.body, updatedAt: new Date().toISOString() });
    if (!result) return res.status(404).json({ error: "Запчасть не найдена" });
    res.json(result);
  });

  app.delete("/api/parts/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deletePart(parseInt(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/parts/:id/in", authenticateToken, (req: AuthRequest, res: Response) => {
    const { quantity, price, comment } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ error: "Количество должно быть больше 0" });
    try {
      res.json(storage.partIn(parseInt(req.params.id), quantity, price || null, comment || null));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/parts/:id/out", authenticateToken, (req: AuthRequest, res: Response) => {
    const { quantity, repairId, comment } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ error: "Количество должно быть больше 0" });
    try {
      res.json(storage.partOut(parseInt(req.params.id), quantity, repairId || null, comment || null));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/parts/:id/movements", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getPartMovements(parseInt(req.params.id)));
  });

  // ─── Transactions (касса) ──────────────────────────────────────────────────
  app.get("/api/transactions", authenticateToken, (req: AuthRequest, res: Response) => {
    const { type, dateFrom, dateTo } = req.query as any;
    res.json(storage.getTransactions({ type, dateFrom, dateTo }));
  });

  app.post("/api/transactions", authenticateToken, (req: AuthRequest, res: Response) => {
    const { type, amount, category, description, repairId, paymentMethod, date } = req.body;
    if (!type || !amount || !category) return res.status(400).json({ error: "Тип, сумма и категория обязательны" });
    const now = new Date().toISOString();
    res.json(storage.createTransaction({ type, amount, category, description: description || null, repairId: repairId || null, paymentMethod: paymentMethod || "cash", createdAt: now, date: date || now.slice(0, 10) }));
  });

  app.delete("/api/transactions/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteTransaction(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Salaries (зарплата мастеров) ──────────────────────────────────────────
  app.get("/api/salaries", authenticateToken, (req: AuthRequest, res: Response) => {
    const { masterId, period, paid } = req.query as any;
    const filters: any = {};
    if (masterId) filters.masterId = parseInt(masterId);
    if (period) filters.period = period;
    if (paid !== undefined) filters.paid = paid === "true";
    res.json(storage.getSalaries(Object.keys(filters).length ? filters : undefined));
  });

  app.get("/api/salaries/totals", authenticateToken, (req: AuthRequest, res: Response) => {
    const { masterId, period } = req.query as any;
    if (!masterId || !period) return res.status(400).json({ error: "masterId и period обязательны" });
    res.json(storage.getSalaryTotals(parseInt(masterId), period));
  });

  app.post("/api/salaries", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { masterId, masterName, type, amount, description, repairId, period, paymentMethod, date } = req.body;
    if (!masterId || !masterName || !type || !amount || !period) {
      return res.status(400).json({ error: "masterId, masterName, type, amount, period обязательны" });
    }
    const now = new Date().toISOString();
    res.json(storage.createSalary({ masterId, masterName, type, amount, description: description || null, repairId: repairId || null, period, paymentMethod: paymentMethod || "cash", paid: false, createdAt: now, date: date || now.slice(0, 10) }));
  });

  app.put("/api/salaries/:id/paid", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { paid } = req.body;
    if (typeof paid !== "boolean") return res.status(400).json({ error: "paid должен быть boolean" });
    const result = storage.updateSalaryPaid(parseInt(req.params.id), paid);
    if (!result) return res.status(404).json({ error: "Запись не найдена" });
    res.json(result);
  });

  app.delete("/api/salaries/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteSalary(parseInt(req.params.id));
    res.json({ ok: true });
  });
}
