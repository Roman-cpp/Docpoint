import type { HistoryRecord } from "../model/types";

/**
 * Mock history: requests the user sent from the HTTP client to the
 * Docpoint API (prod / staging / local). Outgoing log — distinct from the
 * server-side request journal.
 */
export const HC_HISTORY: HistoryRecord[] = [
	{
		id: "h_01",
		method: "POST",
		url: "https://api.docpoint.io/v1/documents",
		code: "201",
		duration: 287,
		sent_at: "2026-06-08T14:38:00Z",
		payload: `{
  "title": "Акт сверки Q1 2026",
  "type": "report",
  "orgId": 47821,
  "tags": ["finance", "q1"]
}`,
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
			{ key: "Content-Type", value: "application/json" },
			{ key: "Accept", value: "application/json" },
			{ key: "X-Org-Id", value: "47821" },
		],
		response: `{
  "id": 8901,
  "title": "Акт сверки Q1 2026",
  "status": "draft",
  "createdAt": "2026-06-05T14:38:02Z"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
			{ key: "Location", value: "/v1/documents/8901" },
			{ key: "X-RateLimit-Remaining", value: "4998" },
		],
	},
	{
		id: "h_02",
		method: "GET",
		url: "https://api.docpoint.io/v1/documents?page=1&per_page=25&status=signed",
		code: "200",
		duration: 64,
		sent_at: "2026-06-08T14:31:00Z",
		payload: "",
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
			{ key: "Accept", value: "application/json" },
		],
		response: `{
  "data": [
    { "id": 8842, "title": "Договор №47", "status": "signed" },
    { "id": 8839, "title": "Соглашение NDA", "status": "signed" }
  ],
  "meta": { "total": 312, "page": 1, "perPage": 25 }
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
			{ key: "X-Total-Count", value: "312" },
			{ key: "Cache-Control", value: "private, max-age=0" },
		],
	},
	{
		id: "h_03",
		method: "GET",
		url: "https://api.docpoint.io/v1/users/me",
		code: "200",
		duration: 22,
		sent_at: "2026-06-08T14:30:00Z",
		payload: "",
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
			{ key: "Accept", value: "application/json" },
		],
		response: `{
  "id": "usr_42",
  "name": "Иван Петров",
  "email": "ivan@acme.io",
  "role": "owner"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
			{ key: "ETag", value: '"a1b2c3d4"' },
		],
	},
	{
		id: "h_04",
		method: "PATCH",
		url: "https://api.docpoint.io/v1/documents/8842",
		code: "200",
		duration: 134,
		sent_at: "2026-06-08T14:22:00Z",
		payload: `{ "status": "archived" }`,
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
			{ key: "Content-Type", value: "application/json" },
		],
		response: `{
  "id": 8842,
  "status": "archived",
  "updatedAt": "2026-06-05T14:22:10Z"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
		],
	},
	{
		id: "h_05",
		method: "POST",
		url: "https://api.docpoint.io/v1/auth/refresh",
		code: "401",
		duration: 96,
		sent_at: "2026-06-08T13:58:00Z",
		payload: `{ "refreshToken": "rt_8b4c…expired" }`,
		payload_headers: [{ key: "Content-Type", value: "application/json" }],
		response: `{
  "message": "Refresh-токен недействителен или истёк",
  "code": "TOKEN_EXPIRED"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
			{ key: "WWW-Authenticate", value: "Bearer" },
		],
	},
	{
		id: "h_06",
		method: "DELETE",
		url: "https://api.docpoint.io/v1/documents/8830",
		code: "204",
		duration: 71,
		sent_at: "2026-06-08T13:40:00Z",
		payload: "",
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
		],
		response: `(пустое тело — 204 No Content)`,
		response_headers: [{ key: "Cache-Control", value: "no-cache" }],
	},
	{
		id: "h_07",
		method: "GET",
		url: "https://staging.docpoint.io/v1/reports/monthly?month=05",
		code: "500",
		duration: 1240,
		sent_at: "2026-06-07T18:12:00Z",
		payload: "",
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
		],
		response: `{
  "message": "Не удалось сформировать отчёт",
  "code": "INTERNAL_ERROR",
  "traceId": "5f2a-91c0"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
		],
	},
	{
		id: "h_08",
		method: "PUT",
		url: "https://api.docpoint.io/v1/organizations/47821/settings",
		code: "200",
		duration: 158,
		sent_at: "2026-06-07T17:05:00Z",
		payload: `{
  "locale": "ru",
  "timezone": "Europe/Moscow",
  "twoFactor": true
}`,
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
			{ key: "Content-Type", value: "application/json" },
		],
		response: `{ "ok": true, "updated": 3 }`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
		],
	},
	{
		id: "h_09",
		method: "POST",
		url: "https://api.docpoint.io/v1/documents/8842/share",
		code: "422",
		duration: 88,
		sent_at: "2026-06-07T16:40:00Z",
		payload: `{ "email": "не-email", "role": "viewer" }`,
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
			{ key: "Content-Type", value: "application/json" },
		],
		response: `{
  "message": "Ошибка валидации",
  "errors": { "email": ["Некорректный адрес"] }
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
		],
	},
	{
		id: "h_10",
		method: "GET",
		url: "https://api.docpoint.io/v1/documents/9001",
		code: "404",
		duration: 29,
		sent_at: "2026-06-07T15:18:00Z",
		payload: "",
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
		],
		response: `{
  "message": "Документ не найден",
  "code": "NOT_FOUND"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
		],
	},
	{
		id: "h_11",
		method: "POST",
		url: "http://localhost:8080/v1/auth/login",
		code: "200",
		duration: 142,
		sent_at: "2026-06-03T11:02:00Z",
		payload: `{
  "email": "admin@test.com",
  "password": "••••••••"
}`,
		payload_headers: [{ key: "Content-Type", value: "application/json" }],
		response: `{
  "accessToken": "eyJhbGc…9f23",
  "expiresIn": 3600,
  "refreshToken": "rt_8b4c…0a12"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json" },
			{ key: "Cache-Control", value: "no-store" },
		],
	},
	{
		id: "h_12",
		method: "GET",
		url: "https://api.docpoint.io/v1/webhooks",
		code: "200",
		duration: 51,
		sent_at: "2026-06-03T10:46:00Z",
		payload: "",
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
		],
		response: `{
  "data": [
    { "id": "wh_1", "url": "https://acme.io/hooks/docs", "active": true }
  ],
  "meta": { "total": 4 }
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
			{ key: "X-Total-Count", value: "4" },
		],
	},
	{
		id: "h_13",
		method: "POST",
		url: "https://api.docpoint.io/v1/documents/import",
		code: "429",
		duration: 38,
		sent_at: "2026-06-02T19:55:00Z",
		payload: `{ "source": "google-drive", "folderId": "1aZ…" }`,
		payload_headers: [
			{ key: "Authorization", value: "Bearer eyJhbGciOiJIUzI1Ni…" },
			{ key: "Content-Type", value: "application/json" },
		],
		response: `{
  "message": "Слишком много запросов. Повторите через 30 сек.",
  "code": "RATE_LIMITED"
}`,
		response_headers: [
			{ key: "Content-Type", value: "application/json; charset=utf-8" },
			{ key: "Retry-After", value: "30" },
			{ key: "X-RateLimit-Remaining", value: "0" },
		],
	},
	{
		id: "h_14",
		method: "GET",
		url: "https://api.docpoint.io/v1/health",
		code: "0",
		duration: 0,
		sent_at: "2026-06-02T09:14:00Z",
		payload: "",
		payload_headers: [{ key: "Accept", value: "application/json" }],
		response: `Ошибка соединения: ECONNREFUSED
Не удалось установить соединение с api.docpoint.io:443.
Проверьте сеть или адрес сервера.`,
		response_headers: [],
	},
];
