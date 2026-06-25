import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "repair_jwt_secret_change_in_prod_2024!";

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: "Слишком много попыток входа. Подождите 15 минут." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Слишком много запросов." },
});

// Auth middleware
interface AuthRequest extends Request {
  user?: { id: number; role: string; displayName: string; sessionId?: string };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"];
  const token = auth && auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Требуется авторизация" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Проверяем sessionId — если зашли с другого устройства, выкидываем
    if (payload.sessionId) {
      const session = storage.getSession(payload.id);
      if (!session || session.sessionId !== payload.sessionId) {
        return res.status(401).json({ error: "Сессия завершена. Войдите снова." });
      }
    }
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ error: "Токен недействителен или истёк" });
  }
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Доступ только для администратора" });
  }
  next();
}

export function registerRoutes(httpServer: Server, app: Express) {
  app.use("/api", apiLimiter);

  // ─── Auth ────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", loginLimiter, (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Введите логин и пароль" });
    }
    // Sanitize
    if (typeof username !== "string" || username.length > 64) {
      return res.status(400).json({ error: "Неверный формат логина" });
    }
    const user = storage.getUserByUsername(username.trim().toLowerCase());
    if (!user) return res.status(401).json({ error: "Неверный логин или пароль" });
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Неверный логин или пароль" });
    const sessionId = randomUUID();
    storage.upsertSession(user.id, sessionId);
    const token = jwt.sign(
      { id: user.id, role: user.role, displayName: user.displayName, sessionId },
      JWT_SECRET,
      { expiresIn: "30d" } // долгоживущий токен — выход только вручную или с другого устройства
    );
    res.json({ token, role: user.role, displayName: user.displayName });
  });

  app.get("/api/auth/me", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(req.user);
  });

  app.post("/api/auth/logout", authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user?.id) storage.deleteSession(req.user.id);
    res.json({ ok: true });
  });

  // ─── Categories ───────────────────────────────────────────────────────────
  app.get("/api/categories", (req, res) => {
    res.json(storage.getCategories());
  });

  app.post("/api/categories", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { name, icon, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Название категории обязательно" });
    const cat = storage.createCategory({ name, icon: icon || "Smartphone", sortOrder: sortOrder ?? 0 });
    res.json(cat);
  });

  app.put("/api/categories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const result = storage.updateCategory(id, req.body);
    if (!result) return res.status(404).json({ error: "Категория не найдена" });
    res.json(result);
  });

  app.delete("/api/categories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteCategory(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Subcategories ────────────────────────────────────────────
  app.get("/api/subcategories", (req, res) => {
    const catId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
    if (!catId) return res.status(400).json({ error: "categoryId обязателен" });
    res.json(storage.getSubcategoriesByCategory(catId));
  });

  app.post("/api/subcategories", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { categoryId, name, sortOrder } = req.body;
    if (!categoryId || !name) return res.status(400).json({ error: "Категория и название обязательны" });
    const sub = storage.createSubcategory({ categoryId, name, sortOrder: sortOrder ?? 0 });
    res.json(sub);
  });

  app.put("/api/subcategories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const result = storage.updateSubcategory(id, req.body);
    if (!result) return res.status(404).json({ error: "Подкатегория не найдена" });
    res.json(result);
  });

  app.delete("/api/subcategories/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    storage.deleteSubcategory(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── Device Models ────────────────────────────────────────────
  app.get("/api/models", (req, res) => {
    const catId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
    const subId = req.query.subcategoryId ? parseInt(req.query.subcategoryId as string) : null;
    if (subId) {
      res.json(storage.getDeviceModelsBySubcategory(subId));
    } else if (catId) {
      res.json(storage.getDeviceModelsByCategory(catId));
    } else {
      res.json(storage.getAllDeviceModels());
    }
  });

  app.post("/api/models", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { categoryId, subcategoryId, name, sortOrder } = req.body;
    if (!categoryId || !name) return res.status(400).json({ error: "Категория и название обязательны" });
    const model = storage.createDeviceModel({ categoryId, subcategoryId: subcategoryId ?? null, name, sortOrder: sortOrder ?? 0 });
    res.json(model);
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

  // ─── Services ─────────────────────────────────────────────────────────────
  app.get("/api/services", (req, res) => {
    const modelId = req.query.modelId ? parseInt(req.query.modelId as string) : null;
    if (!modelId) return res.status(400).json({ error: "Укажите modelId" });
    res.json(storage.getServicesByModel(modelId));
  });

  app.post("/api/services", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { deviceModelId, name, price, priceMax, duration, sortOrder } = req.body;
    if (!deviceModelId || !name || price === undefined) {
      return res.status(400).json({ error: "Обязательные поля: deviceModelId, name, price" });
    }
    const svc = storage.createService({ deviceModelId, name, price, priceMax: priceMax || null, duration: duration || null, sortOrder: sortOrder ?? 0 });
    res.json(svc);
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

  // ─── Suppliers ────────────────────────────────────────────────────────────
  app.get("/api/suppliers", (req, res) => {
    res.json(storage.getSuppliers());
  });

  app.post("/api/suppliers", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { name, type, contact, phone, website, notes, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Название обязательно" });
    const sup = storage.createSupplier({ name, type: type || "supplier", contact: contact || null, phone: phone || null, website: website || null, notes: notes || null, sortOrder: sortOrder ?? 0 });
    res.json(sup);
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

  // ─── Change Requests ──────────────────────────────────────────────────────
  app.get("/api/requests", authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user?.role === "admin") {
      res.json(storage.getChangeRequests());
    } else {
      res.json(storage.getPendingChangeRequests());
    }
  });

  app.post("/api/requests", authenticateToken, (req: AuthRequest, res: Response) => {
    const { type, description, targetId, targetType, proposedValue } = req.body;
    if (!type || !description) return res.status(400).json({ error: "Тип и описание обязательны" });
    const cr = storage.createChangeRequest({
      userId: req.user!.id,
      type,
      description,
      targetId: targetId || null,
      targetType: targetType || null,
      proposedValue: proposedValue ? JSON.stringify(proposedValue) : null,
      createdAt: new Date().toISOString(),
    });
    res.json(cr);
  });

  app.put("/api/requests/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { status, adminComment } = req.body;
    if (!status) return res.status(400).json({ error: "Статус обязателен" });
    const result = storage.updateChangeRequestStatus(parseInt(req.params.id), status, adminComment);
    if (!result) return res.status(404).json({ error: "Запрос не найден" });
    res.json(result);
  });

  // ─── Admin: User Management ───────────────────────────────────────────────
  app.get("/api/admin/users", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const allUsers = storage.getAllUsers();
    res.json(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role, displayName: u.displayName })));
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

  app.post("/api/admin/users", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { username, password, role, displayName } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: "Логин, пароль и имя обязательны" });
    }
    if (password.length < 6) return res.status(400).json({ error: "Пароль минимум 6 символов" });
    const existing = storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Пользователь с таким логином уже существует" });
    const passwordHash = bcrypt.hashSync(password, 12);
    const user = storage.createUser({ username: username.toLowerCase(), passwordHash, role: role || "master", displayName });
    res.json({ id: user.id, username: user.username, role: user.role, displayName: user.displayName });
  });

  // ─── Repairs (Заявки/Ремонты) ───────────────────────────────────────────────
  app.get("/api/repairs", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getRepairs());
  });

  app.get("/api/repairs/new-count", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json({ count: storage.getNewRepairsCount() });
  });

  app.get("/api/repairs/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    const repair = storage.getRepairById(parseInt(req.params.id));
    if (!repair) return res.status(404).json({ error: "Заявка не найдена" });
    res.json(repair);
  });

  app.post("/api/repairs", authenticateToken, (req: AuthRequest, res: Response) => {
    const { clientName, phone, deviceType, brand, model, imei, appearance, issue,
            estimatedPrice, finalPrice, prepayment, deadline, warranty,
            masterId, masterComment, status, clientId, discount } = req.body;
    if (!clientName && !clientId) {
      return res.status(400).json({ error: "Укажите клиента" });
    }
    // Автоматически создаём или находим клиента по телефону
    let resolvedClientId = clientId || null;
    if (phone && !resolvedClientId) {
      const existing = storage.getClientByPhone(phone);
      if (existing) {
        resolvedClientId = existing.id;
      } else if (clientName) {
        const newClient = storage.createClient({
          name: clientName,
          phone: phone || "",
          email: null,
          notes: null,
          createdAt: new Date().toISOString(),
        });
        resolvedClientId = newClient.id;
      }
    }
    const now = new Date().toISOString();
    const repair = storage.createRepair({
      clientId: resolvedClientId,
      clientName: clientName || null,
      phone: phone || null,
      deviceType: deviceType || null,
      brand: brand || null,
      model: model || null,
      imei: imei || null,
      appearance: appearance || null,
      issue: issue || null,
      estimatedPrice: estimatedPrice || null,
      finalPrice: finalPrice || null,
      prepayment: prepayment || null,
      deadline: deadline || null,
      warranty: warranty || null,
      masterId: masterId || null,
      masterComment: masterComment || null,
      status: status || "новая",
      called: false,
      source: "manual",
      messageId: null,
      sourceUrl: null,
      discount: discount || null,
      rawText: null,
      location: null,
      createdAt: now,
      updatedAt: now,
    });
    res.json(repair);
  });

  app.put("/api/repairs/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const result = storage.updateRepair(id, req.body);
    if (!result) return res.status(404).json({ error: "Заявка не найдена" });
    res.json(result);
  });

  app.delete("/api/repairs/:id", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    storage.updateRepair(id, { status: "отказ" }); // мягкое удаление
    res.json({ ok: true });
  });

  // Алиасы /api/orders для совместимости с фронтендом
  app.get("/api/orders", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getRepairs());
  });
  app.get("/api/orders/new-count", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json({ count: storage.getNewRepairsCount() });
  });
  app.put("/api/orders/:id/status", authenticateToken, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ["новая", "в_работе", "готово", "отказ", "записал"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Недопустимый статус" });
    }
    const result = storage.updateRepair(id, { status });
    if (!result) return res.status(404).json({ error: "Заявка не найдена" });
    res.json(result);
  });
  app.put("/api/orders/:id/called", authenticateToken, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const { called } = req.body;
    if (typeof called !== "boolean") {
      return res.status(400).json({ error: "called должен быть boolean" });
    }
    const result = storage.updateRepair(id, { called });
    if (!result) return res.status(404).json({ error: "Заявка не найдена" });
    res.json(result);
  });

  // ─── Clients (База клиентов) ─────────────────────────────────────────────────
  app.get("/api/clients", authenticateToken, (req: AuthRequest, res: Response) => {
    const q = req.query.q as string | undefined;
    if (q) return res.json(storage.searchClients(q));
    res.json(storage.getClients());
  });

  app.get("/api/clients/:id", authenticateToken, (req: AuthRequest, res: Response) => {
    const client = storage.getClientById(parseInt(req.params.id));
    if (!client) return res.status(404).json({ error: "Клиент не найден" });
    res.json(client);
  });

  app.get("/api/clients/:id/repairs", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getRepairsByClient(parseInt(req.params.id)));
  });

  app.post("/api/clients", authenticateToken, (req: AuthRequest, res: Response) => {
    const { name, phone, email, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Имя и телефон обязательны" });
    const existing = storage.getClientByPhone(phone);
    if (existing) return res.status(409).json({ error: "Клиент с таким телефоном уже существует", client: existing });
    const client = storage.createClient({ name, phone, email: email || null, notes: notes || null, createdAt: new Date().toISOString() });
    res.json(client);
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
}
