import imapSimple from "imap-simple";
import { simpleParser } from "mailparser";
import { storage } from "./storage";
import { log } from "./index";

const IMAP_CONFIG = {
  imap: {
    user: process.env.YANDEX_EMAIL || "etoservice-krd@yandex.ru",
    password: process.env.YANDEX_APP_PASSWORD || "fegnrvqezsrcuxxt",
    host: "imap.yandex.ru",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
    connTimeout: 15000,
  },
};

// Парсит текст письма квиза в объект заявки
function parseQuizEmail(text: string, subject: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  function extract(key: string): string | undefined {
    for (const line of lines) {
      if (line.toLowerCase().startsWith(key.toLowerCase())) {
        const val = line.slice(key.length).replace(/^[:：\s]+/, "").trim();
        if (val) return val;
      }
    }
    return undefined;
  }

  // Ищем ответы на вопросы квиза (поддержка форматов: "Вопрос → Ответ" и "Вопрос:\nОтвет: ...")
  function extractAnswer(question: string): string | undefined {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(question.toLowerCase())) {
        // Формат 1: Вопрос: ... → Ответ
        const arrow = lines[i].match(/→\s*(.+)$/);
        if (arrow) return arrow[1].trim();
        // Формат 2 (Envybox): следующая строка "Ответ: ..."
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const answerMatch = nextLine.match(/^ответ[:\s]+(.+)$/i);
          if (answerMatch) return answerMatch[1].trim();
          // Просто следующая строка
          if (!nextLine.toLowerCase().startsWith("вопрос")) return nextLine;
        }
      }
    }
    return undefined;
  }

  const clientName = extract("Имя клиента");
  const phone = extract("Телефон");
  const discount = extract("Скидка");
  const location = extract("Месторасположение клиента");
  const sourceUrl = extract("Адрес страницы");

  // Устройство, марка, неисправность из вопросов квиза
  let device = extractAnswer("Что необходимо отремонтировать");
  let brand = extractAnswer("Выберите марку");
  let issue = extractAnswer("Выберите неисправность");

  // Дополнительные поля из Envybox формата
  let model = extractAnswer("Выберите модель") || extractAnswer("модель");

  // Fallback: попробуем найти по другим паттернам
  if (!device) device = extractAnswer("Тип устройства") || extractAnswer("тип устройства");
  if (!brand) brand = extractAnswer("марку телефона") || extractAnswer("Марка") || extractAnswer("марку");
  if (!issue) issue = extractAnswer("неисправность") || extractAnswer("Проблема") || extractAnswer("Какая у вас");

  // Если есть модель — добавляем к бренду для наглядности
  if (model && brand) brand = `${brand} ${model}`;
  else if (model) brand = model;

  return {
    clientName: clientName || null,
    phone: phone || null,
    discount: discount || null,
    device: device || null,
    brand: brand || null,
    issue: issue || null,
    location: location || null,
    sourceUrl: sourceUrl || null,
    rawText: text.slice(0, 2000),
  };
}

async function pollOnce() {
  let connection: imapSimple.ImapSimple | null = null;
  try {
    connection = await imapSimple.connect(IMAP_CONFIG);
    await connection.openBox("INBOX");

    // Ищем все письма, которые содержат слово "заявку" в теме
    // Или от квиз-сервиса
    const searchCriteria = [["SUBJECT", "заявк"]];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
      markSeen: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    let newCount = 0;

    for (const msg of messages) {
      // Получаем message-id
      const headerPart = msg.parts.find((p: any) => p.which === "HEADER");
      const headers = headerPart?.body || {};
      const midArr = (headers["message-id"] || headers["Message-ID"] || []);
      const rawMessageId = Array.isArray(midArr) ? (midArr[0] || "") : String(midArr);
      const messageId = (rawMessageId || `uid-${msg.attributes.uid}`).replace(/[<>]/g, "").trim();

      // Пропускаем уже сохранённые
      if (storage.orderExists(messageId)) continue;

      // Парсим полное тело письма
      const fullBody = msg.parts.find((p: any) => p.which === "");
      if (!fullBody) continue;

      const parsed = await simpleParser(fullBody.body);
      const htmlText = typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, "\n") : "";
      const textContent = parsed.text || htmlText || "";

      if (!textContent) continue;

      const fields = parseQuizEmail(textContent, parsed.subject || "");

      storage.createOrder({
        messageId,
        ...fields,
        status: "новая",
        called: false,
        assignedTo: null,
        createdAt: (parsed.date || new Date()).toISOString(),
      });

      newCount++;
      log(`[emailPoller] Новая заявка: ${fields.clientName || "?"} ${fields.phone || ""}`);
    }

    if (newCount > 0) {
      log(`[emailPoller] Добавлено ${newCount} новых заявок`);
    }
  } catch (err: any) {
    log(`[emailPoller] Ошибка: ${err?.message || err}`);
  } finally {
    if (connection) {
      try { connection.end(); } catch {}
    }
  }
}

// Запускаем сразу и потом каждые 2 минуты
export function startEmailPoller() {
  log("[emailPoller] Запуск. Первая проверка...");
  pollOnce();
  setInterval(() => {
    pollOnce();
  }, 2 * 60 * 1000);
}
