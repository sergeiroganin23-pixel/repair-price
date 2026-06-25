import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
  user?: { id: number; role: string; displayName: string };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"];
  const token = auth && auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Требуется авторизация" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
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
    const token = jwt.sign(
      { id: user.id, role: user.role, displayName: user.displayName },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({ token, role: user.role, displayName: user.displayName });
  });

  app.get("/api/auth/me", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(req.user);
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

  // ─── Device Models ────────────────────────────────────────────────────────
  app.get("/api/models", (req, res) => {
    const catId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
    if (catId) {
      res.json(storage.getDeviceModelsByCategory(catId));
    } else {
      res.json(storage.getAllDeviceModels());
    }
  });

  app.post("/api/models", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { categoryId, name, sortOrder } = req.body;
    if (!categoryId || !name) return res.status(400).json({ error: "Категория и название обязательны" });
    const model = storage.createDeviceModel({ categoryId, name, sortOrder: sortOrder ?? 0 });
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
}
