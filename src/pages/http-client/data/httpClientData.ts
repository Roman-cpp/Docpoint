import type { HttpMethod } from "@/entities/endpoint";
import type { MockResponse } from "../model/types";

export const METHOD_CFG: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
	HEAD: { color: "var(--ink-mid)", bg: "var(--cat-bg)" },
};

const MOCK: Record<string, MockResponse> = {
	users_list: {
		status: 200,
		time: 87,
		size: "1.4 KB",
		body: {
			data: [
				{
					id: "3fa85f64-5717-4562-b3fc",
					name: "Alice Smith",
					email: "alice@example.com",
					role: "editor",
					created_at: "2025-03-14T10:22:00Z",
				},
				{
					id: "9bc12e44-2201-4f88-a99d",
					name: "Bob Jones",
					email: "bob@example.com",
					role: "viewer",
					created_at: "2025-04-01T08:00:00Z",
				},
			],
			meta: { total: 142, page: 1, per_page: 20, last_page: 8 },
		},
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"X-RateLimit-Limit": "1000",
			"X-RateLimit-Remaining": "997",
			"X-RateLimit-Reset": "1746370800",
			"Cache-Control": "no-cache, private",
			"X-Request-Id": "f7b3c2a1-84d5-4e9f-a012-1234567890ab",
		},
	},
	auth_token: {
		status: 200,
		time: 142,
		size: "0.6 KB",
		body: {
			access_token:
				"eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NCJ9...",
			refresh_token: "def50200a0b1c2d3e4f5...",
			expires_in: 3600,
			token_type: "Bearer",
		},
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"X-RateLimit-Limit": "1000",
			"X-RateLimit-Remaining": "999",
		},
	},
	not_found: {
		status: 404,
		time: 32,
		size: "0.1 KB",
		body: {
			error: "not_found",
			message: "The requested resource does not exist.",
		},
		headers: { "Content-Type": "application/json; charset=utf-8" },
	},
	unauthorized: {
		status: 401,
		time: 28,
		size: "0.1 KB",
		body: { error: "unauthorized", message: "Token missing or invalid." },
		headers: { "Content-Type": "application/json; charset=utf-8" },
	},
	created: {
		status: 201,
		time: 184,
		size: "0.4 KB",
		body: {
			data: {
				id: "7ab34c11-9f22-4d88-b10a",
				name: "New User",
				email: "new@example.com",
				role: "viewer",
				created_at: "2026-05-01T12:00:00Z",
			},
		},
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Location: "/v2/users/7ab34c11-9f22-4d88-b10a",
		},
	},
	server_error: {
		status: 500,
		time: 3200,
		size: "0.1 KB",
		body: {
			error: "server_error",
			message: "An unexpected error occurred. Please try again.",
		},
		headers: { "Content-Type": "application/json; charset=utf-8" },
	},
};

export function pickMockResponse(
	method: HttpMethod,
	url: string,
): MockResponse | null {
	const u = url.toLowerCase();
	if (!url.trim()) return null;
	if (u.includes("auth/token") || u.includes("login")) return MOCK.auth_token;
	if (u.includes("/users") && method === "POST") return MOCK.created;
	if (u.includes("/users")) return MOCK.users_list;
	if (u.includes("nonexistent") || u.includes("404")) return MOCK.not_found;
	if (u.includes("error") || u.includes("500")) return MOCK.server_error;
	if (!url.includes("token") && (method === "GET" || method === "DELETE")) {
		if (Math.random() < 0.15) return MOCK.unauthorized;
	}
	if (method === "POST" || method === "PUT" || method === "PATCH")
		return MOCK.created;
	return MOCK.users_list;
}
