import type { HistoryGroup, HistoryRecord } from "../model/types";

/**
 * Mock history: requests the user sent from the HTTP client to the
 * Docpoint API (prod / staging / local). Outgoing log — distinct from the
 * server-side request journal.
 */
export const HC_HISTORY: HistoryRecord[] = [
	// ───── Today ─────
	{
		id: "h_01",
		group: "today",
		method: "POST",
		url: "https://api.docpoint.io/v1/documents",
		status: 201,
		duration: 287,
		size: "642 Б",
		sentAt: "14:38",
		title: "Создать документ",
		params: [],
		headers: [
			["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true],
			["Content-Type", "application/json"],
			["Accept", "application/json"],
			["X-Org-Id", "47821"],
		],
		body: `{
  "title": "Акт сверки Q1 2026",
  "type": "report",
  "orgId": 47821,
  "tags": ["finance", "q1"]
}`,
		respHeaders: [
			["Content-Type", "application/json; charset=utf-8"],
			["Location", "/v1/documents/8901"],
			["X-RateLimit-Remaining", "4998"],
		],
		response: `{
  "id": 8901,
  "title": "Акт сверки Q1 2026",
  "status": "draft",
  "createdAt": "2026-06-05T14:38:02Z"
}`,
		timing: { dns: 6, conn: 14, tls: 28, wait: 224, dl: 15 },
	},
	{
		id: "h_02",
		group: "today",
		method: "GET",
		url: "https://api.docpoint.io/v1/documents?page=1&per_page=25&status=signed",
		status: 200,
		duration: 64,
		size: "8.4 КБ",
		sentAt: "14:31",
		title: "Список документов",
		params: [
			["page", "1"],
			["per_page", "25"],
			["status", "signed"],
		],
		headers: [
			["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true],
			["Accept", "application/json"],
		],
		body: null,
		respHeaders: [
			["Content-Type", "application/json; charset=utf-8"],
			["X-Total-Count", "312"],
			["Cache-Control", "private, max-age=0"],
		],
		response: `{
  "data": [
    { "id": 8842, "title": "Договор №47", "status": "signed" },
    { "id": 8839, "title": "Соглашение NDA", "status": "signed" }
  ],
  "meta": { "total": 312, "page": 1, "perPage": 25 }
}`,
		timing: { dns: 0, conn: 2, tls: 0, wait: 56, dl: 6 },
	},
	{
		id: "h_03",
		group: "today",
		method: "GET",
		url: "https://api.docpoint.io/v1/users/me",
		status: 200,
		duration: 22,
		size: "318 Б",
		sentAt: "14:30",
		title: "Текущий пользователь",
		params: [],
		headers: [
			["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true],
			["Accept", "application/json"],
		],
		body: null,
		respHeaders: [
			["Content-Type", "application/json; charset=utf-8"],
			["ETag", '"a1b2c3d4"'],
		],
		response: `{
  "id": "usr_42",
  "name": "Иван Петров",
  "email": "ivan@acme.io",
  "role": "owner"
}`,
		timing: { dns: 0, conn: 1, tls: 0, wait: 18, dl: 3 },
	},
	{
		id: "h_04",
		group: "today",
		method: "PATCH",
		url: "https://api.docpoint.io/v1/documents/8842",
		status: 200,
		duration: 134,
		size: "204 Б",
		sentAt: "14:22",
		title: "Архивировать документ",
		params: [],
		headers: [
			["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true],
			["Content-Type", "application/json"],
		],
		body: `{ "status": "archived" }`,
		respHeaders: [["Content-Type", "application/json; charset=utf-8"]],
		response: `{
  "id": 8842,
  "status": "archived",
  "updatedAt": "2026-06-05T14:22:10Z"
}`,
		timing: { dns: 0, conn: 2, tls: 0, wait: 126, dl: 6 },
	},
	{
		id: "h_05",
		group: "today",
		method: "POST",
		url: "https://api.docpoint.io/v1/auth/refresh",
		status: 401,
		duration: 96,
		size: "112 Б",
		sentAt: "13:58",
		title: "Обновить токен",
		params: [],
		headers: [["Content-Type", "application/json"]],
		body: `{ "refreshToken": "rt_8b4c…expired" }`,
		respHeaders: [
			["Content-Type", "application/json; charset=utf-8"],
			["WWW-Authenticate", "Bearer"],
		],
		response: `{
  "message": "Refresh-токен недействителен или истёк",
  "code": "TOKEN_EXPIRED"
}`,
		timing: { dns: 0, conn: 3, tls: 0, wait: 88, dl: 5 },
	},
	{
		id: "h_06",
		group: "today",
		method: "DELETE",
		url: "https://api.docpoint.io/v1/documents/8830",
		status: 204,
		duration: 71,
		size: "0 Б",
		sentAt: "13:40",
		title: "Удалить документ",
		params: [],
		headers: [["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true]],
		body: null,
		respHeaders: [["Cache-Control", "no-cache"]],
		response: `(пустое тело — 204 No Content)`,
		timing: { dns: 0, conn: 2, tls: 0, wait: 64, dl: 5 },
	},

	// ───── Yesterday ─────
	{
		id: "h_07",
		group: "yesterday",
		method: "GET",
		url: "https://staging.docpoint.io/v1/reports/monthly?month=05",
		status: 500,
		duration: 1240,
		size: "98 Б",
		sentAt: "18:12",
		title: "Месячный отчёт",
		params: [["month", "05"]],
		headers: [["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true]],
		body: null,
		respHeaders: [["Content-Type", "application/json; charset=utf-8"]],
		response: `{
  "message": "Не удалось сформировать отчёт",
  "code": "INTERNAL_ERROR",
  "traceId": "5f2a-91c0"
}`,
		timing: { dns: 8, conn: 16, tls: 30, wait: 1180, dl: 6 },
	},
	{
		id: "h_08",
		group: "yesterday",
		method: "PUT",
		url: "https://api.docpoint.io/v1/organizations/47821/settings",
		status: 200,
		duration: 158,
		size: "84 Б",
		sentAt: "17:05",
		title: "Настройки организации",
		params: [],
		headers: [
			["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true],
			["Content-Type", "application/json"],
		],
		body: `{
  "locale": "ru",
  "timezone": "Europe/Moscow",
  "twoFactor": true
}`,
		respHeaders: [["Content-Type", "application/json; charset=utf-8"]],
		response: `{ "ok": true, "updated": 3 }`,
		timing: { dns: 0, conn: 3, tls: 0, wait: 148, dl: 7 },
	},
	{
		id: "h_09",
		group: "yesterday",
		method: "POST",
		url: "https://api.docpoint.io/v1/documents/8842/share",
		status: 422,
		duration: 88,
		size: "176 Б",
		sentAt: "16:40",
		title: "Поделиться документом",
		params: [],
		headers: [
			["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true],
			["Content-Type", "application/json"],
		],
		body: `{ "email": "не-email", "role": "viewer" }`,
		respHeaders: [["Content-Type", "application/json; charset=utf-8"]],
		response: `{
  "message": "Ошибка валидации",
  "errors": { "email": ["Некорректный адрес"] }
}`,
		timing: { dns: 0, conn: 2, tls: 0, wait: 80, dl: 6 },
	},
	{
		id: "h_10",
		group: "yesterday",
		method: "GET",
		url: "https://api.docpoint.io/v1/documents/9001",
		status: 404,
		duration: 29,
		size: "92 Б",
		sentAt: "15:18",
		title: "Документ по id",
		params: [],
		headers: [["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true]],
		body: null,
		respHeaders: [["Content-Type", "application/json; charset=utf-8"]],
		response: `{
  "message": "Документ не найден",
  "code": "NOT_FOUND"
}`,
		timing: { dns: 0, conn: 1, tls: 0, wait: 26, dl: 2 },
	},

	// ───── Earlier ─────
	{
		id: "h_11",
		group: "earlier",
		method: "POST",
		url: "http://localhost:8080/v1/auth/login",
		status: 200,
		duration: 142,
		size: "428 Б",
		sentAt: "3 июн · 11:02",
		title: "Локальный вход",
		params: [],
		headers: [["Content-Type", "application/json"]],
		body: `{
  "email": "admin@test.com",
  "password": "••••••••"
}`,
		respHeaders: [
			["Content-Type", "application/json"],
			["Cache-Control", "no-store"],
		],
		response: `{
  "accessToken": "eyJhbGc…9f23",
  "expiresIn": 3600,
  "refreshToken": "rt_8b4c…0a12"
}`,
		timing: { dns: 0, conn: 1, tls: 0, wait: 134, dl: 7 },
	},
	{
		id: "h_12",
		group: "earlier",
		method: "GET",
		url: "https://api.docpoint.io/v1/webhooks",
		status: 200,
		duration: 51,
		size: "1.2 КБ",
		sentAt: "3 июн · 10:46",
		title: "Список вебхуков",
		params: [],
		headers: [["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true]],
		body: null,
		respHeaders: [
			["Content-Type", "application/json; charset=utf-8"],
			["X-Total-Count", "4"],
		],
		response: `{
  "data": [
    { "id": "wh_1", "url": "https://acme.io/hooks/docs", "active": true }
  ],
  "meta": { "total": 4 }
}`,
		timing: { dns: 4, conn: 10, tls: 22, wait: 10, dl: 5 },
	},
	{
		id: "h_13",
		group: "earlier",
		method: "POST",
		url: "https://api.docpoint.io/v1/documents/import",
		status: 429,
		duration: 38,
		size: "148 Б",
		sentAt: "2 июн · 19:55",
		title: "Импорт документов",
		params: [],
		headers: [
			["Authorization", "Bearer eyJhbGciOiJIUzI1Ni…", true],
			["Content-Type", "application/json"],
		],
		body: `{ "source": "google-drive", "folderId": "1aZ…" }`,
		respHeaders: [
			["Content-Type", "application/json; charset=utf-8"],
			["Retry-After", "30"],
			["X-RateLimit-Remaining", "0"],
		],
		response: `{
  "message": "Слишком много запросов. Повторите через 30 сек.",
  "code": "RATE_LIMITED"
}`,
		timing: { dns: 0, conn: 2, tls: 0, wait: 32, dl: 4 },
	},
	{
		id: "h_14",
		group: "earlier",
		method: "GET",
		url: "https://api.docpoint.io/v1/health",
		status: 0,
		duration: 0,
		size: "—",
		sentAt: "2 июн · 09:14",
		title: "Проверка здоровья",
		failed: true,
		params: [],
		headers: [["Accept", "application/json"]],
		body: null,
		respHeaders: [],
		response: `Ошибка соединения: ECONNREFUSED
Не удалось установить соединение с api.docpoint.io:443.
Проверьте сеть или адрес сервера.`,
		isError: true,
		timing: null,
	},
];

export const HC_GROUPS: HistoryGroup[] = [
	{ id: "today", label: "Сегодня" },
	{ id: "yesterday", label: "Вчера" },
	{ id: "earlier", label: "Ранее" },
];
