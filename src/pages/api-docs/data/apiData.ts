import type { ApiData, EndpointDetail } from "../model/types";

export const API_DATA: ApiData = {
	version: "v2",
	baseUrl: "https://api.example.com",
	groups: [
		{
			id: "auth",
			label: "Authentication",
			endpoints: [
				{
					id: "auth-token",
					method: "POST",
					path: "/auth/token",
					summary: "Obtain access token",
				},
				{
					id: "auth-refresh",
					method: "POST",
					path: "/auth/refresh",
					summary: "Refresh access token",
				},
				{
					id: "auth-revoke",
					method: "DELETE",
					path: "/auth/token",
					summary: "Revoke token",
				},
			],
		},
		{
			id: "users",
			label: "Users",
			endpoints: [
				{
					id: "users-list",
					method: "GET",
					path: "/users",
					summary: "List all users",
				},
				{
					id: "users-create",
					method: "POST",
					path: "/users",
					summary: "Create a user",
				},
				{
					id: "users-get",
					method: "GET",
					path: "/users/{id}",
					summary: "Get a user",
				},
				{
					id: "users-update",
					method: "PUT",
					path: "/users/{id}",
					summary: "Update a user",
				},
				{
					id: "users-delete",
					method: "DELETE",
					path: "/users/{id}",
					summary: "Delete a user",
				},
			],
		},
		{
			id: "articles",
			label: "Articles",
			endpoints: [
				{
					id: "articles-list",
					method: "GET",
					path: "/articles",
					summary: "List articles",
				},
				{
					id: "articles-create",
					method: "POST",
					path: "/articles",
					summary: "Create article",
				},
				{
					id: "articles-get",
					method: "GET",
					path: "/articles/{id}",
					summary: "Get article",
				},
				{
					id: "articles-update",
					method: "PATCH",
					path: "/articles/{id}",
					summary: "Update article",
				},
				{
					id: "articles-delete",
					method: "DELETE",
					path: "/articles/{id}",
					summary: "Delete article",
				},
			],
		},
		{
			id: "comments",
			label: "Comments",
			endpoints: [
				{
					id: "comments-list",
					method: "GET",
					path: "/articles/{id}/comments",
					summary: "List comments",
				},
				{
					id: "comments-create",
					method: "POST",
					path: "/articles/{id}/comments",
					summary: "Add comment",
				},
				{
					id: "comments-delete",
					method: "DELETE",
					path: "/comments/{id}",
					summary: "Delete comment",
				},
			],
		},
		{
			id: "tags",
			label: "Tags",
			endpoints: [
				{
					id: "tags-list",
					method: "GET",
					path: "/tags",
					summary: "List all tags",
				},
				{
					id: "tags-get",
					method: "GET",
					path: "/tags/{slug}",
					summary: "Get tag",
				},
			],
		},
	],
};

export const ENDPOINT_DETAILS: Record<string, EndpointDetail> = {
	"users-list": {
		method: "GET",
		path: "/users",
		summary: "List all users",
		description:
			"Returns a paginated list of users. Results can be filtered, sorted, and searched. Requires an active Bearer token with the `users:read` scope.",
		tags: ["paginated", "auth-required"],
		auth: true,
		isNew: false,
		queryParams: [
			{
				name: "page",
				type: "integer",
				required: false,
				desc: "Page number (1-indexed)",
				default: "1",
			},
			{
				name: "per_page",
				type: "integer",
				required: false,
				desc: "Items per page. Max 100.",
				default: "20",
			},
			{
				name: "sort",
				type: "string",
				required: false,
				desc: "Sort field: `created_at`, `name`, `email`",
				default: "created_at",
			},
			{
				name: "order",
				type: "string",
				required: false,
				desc: "Sort direction: `asc` or `desc`",
				default: "desc",
			},
			{
				name: "search",
				type: "string",
				required: false,
				desc: "Search by name or email",
				default: "—",
			},
			{
				name: "role",
				type: "string",
				required: false,
				desc: "Filter by role: `admin`, `editor`, `viewer`",
				default: "—",
			},
		],
		responses: {
			"200": {
				label: "200 OK",
				color: "#1E7E52",
				dotColor: "var(--green)",
				schema: [
					{ key: "data", type: "array", desc: "Array of user objects" },
					{
						key: "data[].id",
						type: "string",
						desc: "UUID of the user",
						example: '"3fa85f64-..."',
					},
					{
						key: "data[].name",
						type: "string",
						desc: "Display name",
						example: '"Alice Smith"',
					},
					{
						key: "data[].email",
						type: "string",
						desc: "Primary email address",
						example: '"alice@example.com"',
					},
					{
						key: "data[].role",
						type: "string",
						desc: "User role: admin · editor · viewer",
						example: '"editor"',
					},
					{
						key: "data[].created_at",
						type: "string",
						desc: "ISO 8601 timestamp",
						example: '"2025-03-14T10:22:00Z"',
					},
					{
						key: "meta.total",
						type: "integer",
						desc: "Total matching records",
						example: "142",
					},
					{
						key: "meta.page",
						type: "integer",
						desc: "Current page",
						example: "1",
					},
					{
						key: "meta.per_page",
						type: "integer",
						desc: "Items per page",
						example: "20",
					},
					{
						key: "meta.last_page",
						type: "integer",
						desc: "Last available page",
						example: "8",
					},
				],
				example: `{\n  "data": [\n    {\n      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",\n      "name": "Alice Smith",\n      "email": "alice@example.com",\n      "role": "editor",\n      "avatar_url": "https://cdn.example.com/avatars/alice.jpg",\n      "created_at": "2025-03-14T10:22:00Z"\n    }\n  ],\n  "meta": {\n    "total": 142,\n    "page": 1,\n    "per_page": 20,\n    "last_page": 8\n  }\n}`,
			},
			"401": {
				label: "401 Unauthorized",
				color: "#9A2800",
				dotColor: "var(--red)",
				schema: [
					{
						key: "error",
						type: "string",
						desc: "Error code",
						example: '"unauthorized"',
					},
					{
						key: "message",
						type: "string",
						desc: "Human-readable message",
						example: '"Token missing or invalid"',
					},
				],
				example: `{\n  "error": "unauthorized",\n  "message": "Token missing or invalid"\n}`,
			},
			"422": {
				label: "422 Validation",
				color: "#9A5F00",
				dotColor: "var(--amber)",
				schema: [
					{
						key: "error",
						type: "string",
						desc: "Error code",
						example: '"validation_error"',
					},
					{
						key: "errors",
						type: "object",
						desc: "Field-level validation errors",
					},
				],
				example: `{\n  "error": "validation_error",\n  "errors": {\n    "per_page": ["Must be between 1 and 100."],\n    "sort": ["Invalid sort field."]\n  }\n}`,
			},
		},
	},

	"users-create": {
		method: "POST",
		path: "/users",
		summary: "Create a user",
		description:
			"Creates a new user account. Requires `users:write` scope. An email verification link is sent automatically after creation.",
		tags: ["auth-required"],
		auth: true,
		isNew: true,
		bodyParams: [
			{
				name: "name",
				type: "string",
				required: true,
				desc: "Full display name",
			},
			{
				name: "email",
				type: "string",
				required: true,
				desc: "Unique email address",
			},
			{
				name: "password",
				type: "string",
				required: true,
				desc: "Min 8 chars, at least 1 uppercase & 1 digit",
			},
			{
				name: "role",
				type: "string",
				required: false,
				desc: "Role to assign: `editor` or `viewer`",
				default: "viewer",
			},
			{
				name: "send_welcome",
				type: "boolean",
				required: false,
				desc: "Send welcome email on creation",
				default: "true",
			},
		],
		responses: {
			"201": {
				label: "201 Created",
				color: "#1E7E52",
				dotColor: "var(--green)",
				schema: [
					{
						key: "data.id",
						type: "string",
						desc: "UUID of the new user",
						example: '"3fa85f64-..."',
					},
					{
						key: "data.name",
						type: "string",
						desc: "Display name",
						example: '"Bob Jones"',
					},
					{
						key: "data.email",
						type: "string",
						desc: "Email address",
						example: '"bob@example.com"',
					},
					{
						key: "data.role",
						type: "string",
						desc: "Assigned role",
						example: '"viewer"',
					},
					{
						key: "data.created_at",
						type: "string",
						desc: "ISO 8601 creation timestamp",
						example: '"2025-04-01T08:00:00Z"',
					},
				],
				example: `{\n  "data": {\n    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",\n    "name": "Bob Jones",\n    "email": "bob@example.com",\n    "role": "viewer",\n    "created_at": "2025-04-01T08:00:00Z"\n  }\n}`,
			},
			"409": {
				label: "409 Conflict",
				color: "#9A2800",
				dotColor: "var(--red)",
				schema: [
					{
						key: "error",
						type: "string",
						desc: "Error code",
						example: '"email_taken"',
					},
					{ key: "message", type: "string", desc: "Human-readable message" },
				],
				example: `{\n  "error": "email_taken",\n  "message": "A user with this email already exists."\n}`,
			},
		},
	},

	"articles-list": {
		method: "GET",
		path: "/articles",
		summary: "List articles",
		description:
			"Returns a paginated list of published articles. Filter by tag, author or date range. Anonymous access is allowed for public articles.",
		tags: ["paginated", "public"],
		auth: false,
		isNew: false,
		queryParams: [
			{
				name: "page",
				type: "integer",
				required: false,
				desc: "Page number",
				default: "1",
			},
			{
				name: "per_page",
				type: "integer",
				required: false,
				desc: "Items per page, max 50",
				default: "15",
			},
			{
				name: "tag",
				type: "string",
				required: false,
				desc: "Filter by tag slug",
				default: "—",
			},
			{
				name: "author_id",
				type: "string",
				required: false,
				desc: "Filter by author UUID",
				default: "—",
			},
			{
				name: "status",
				type: "string",
				required: false,
				desc: "`published`, `draft` (auth required for draft)",
				default: "published",
			},
		],
		responses: {
			"200": {
				label: "200 OK",
				color: "#1E7E52",
				dotColor: "var(--green)",
				schema: [
					{ key: "data[].id", type: "string", desc: "Article UUID" },
					{ key: "data[].title", type: "string", desc: "Article title" },
					{
						key: "data[].slug",
						type: "string",
						desc: "URL slug",
						example: '"the-tap-helper"',
					},
					{ key: "data[].excerpt", type: "string", desc: "Short description" },
					{
						key: "data[].author",
						type: "object",
						desc: "Author object with id, name",
					},
					{ key: "data[].tags", type: "array", desc: "Array of tag objects" },
					{
						key: "data[].published_at",
						type: "string",
						desc: "ISO 8601 publication date",
					},
					{ key: "meta.total", type: "integer", desc: "Total count" },
				],
				example: `{\n  "data": [\n    {\n      "id": "a1b2c3d4-...",\n      "title": "The tap() Helper",\n      "slug": "the-tap-helper",\n      "excerpt": "Call a closure on a value and return the value itself.",\n      "author": { "id": "u1", "name": "Alex Kowalski" },\n      "tags": [{ "slug": "helpers", "name": "Helpers" }],\n      "published_at": "2026-03-14T10:00:00Z"\n    }\n  ],\n  "meta": { "total": 48, "page": 1, "per_page": 15, "last_page": 4 }\n}`,
			},
			"400": {
				label: "400 Bad Request",
				color: "#9A5F00",
				dotColor: "var(--amber)",
				schema: [
					{
						key: "error",
						type: "string",
						desc: "Error code",
						example: '"invalid_param"',
					},
					{ key: "message", type: "string", desc: "Human-readable message" },
				],
				example: `{\n  "error": "invalid_param",\n  "message": "status 'archived' is not allowed without admin scope."\n}`,
			},
		},
	},

	"auth-token": {
		method: "POST",
		path: "/auth/token",
		summary: "Obtain access token",
		description:
			"Exchange user credentials for a short-lived access token and a long-lived refresh token. Access tokens expire after 60 minutes.",
		tags: ["public"],
		auth: false,
		isNew: false,
		bodyParams: [
			{
				name: "email",
				type: "string",
				required: true,
				desc: "Registered email address",
			},
			{
				name: "password",
				type: "string",
				required: true,
				desc: "Account password",
			},
			{
				name: "device_name",
				type: "string",
				required: false,
				desc: "Human-readable device identifier",
				default: "—",
			},
		],
		responses: {
			"200": {
				label: "200 OK",
				color: "#1E7E52",
				dotColor: "var(--green)",
				schema: [
					{
						key: "access_token",
						type: "string",
						desc: "Bearer token (expires 60 min)",
						example: '"eyJ0eXAi..."',
					},
					{
						key: "refresh_token",
						type: "string",
						desc: "Opaque refresh token (expires 30 days)",
						example: '"def502..."',
					},
					{
						key: "expires_in",
						type: "integer",
						desc: "Seconds until access_token expires",
						example: "3600",
					},
					{
						key: "token_type",
						type: "string",
						desc: "Always `Bearer`",
						example: '"Bearer"',
					},
				],
				example: `{\n  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",\n  "refresh_token": "def50200...",\n  "expires_in": 3600,\n  "token_type": "Bearer"\n}`,
			},
			"401": {
				label: "401 Unauthorized",
				color: "#9A2800",
				dotColor: "var(--red)",
				schema: [
					{
						key: "error",
						type: "string",
						desc: "Error code",
						example: '"invalid_credentials"',
					},
					{ key: "message", type: "string", desc: "Human-readable message" },
				],
				example: `{\n  "error": "invalid_credentials",\n  "message": "The email or password is incorrect."\n}`,
			},
		},
	},
};
