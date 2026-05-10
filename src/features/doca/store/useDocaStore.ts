import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Doca } from "@/entities/doca";
import type { EnvConfig } from "@/entities/env-config";
import type { Group } from "@/entities/group";
import type { Endpoint } from "@/entities/endpoint";
import type { Schema } from "@/entities/schema";
import {
	getDb,
	readAllDocaIds,
	readDoca,
	readGroups,
	readSchemas,
	readEnvConfigs,
	writeDoca,
	writeGroups,
	writeSchemas,
	writeEnvConfigs,
} from "@/shared/db";

type DocaState = {
	doca: Doca | null;
	groups: Group[] | null;
	schema: Schema[];
	envConfigs: EnvConfig[];

	selectedEnvConfig: EnvConfig | null;
	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
};

type DocaActions = {
	selectGroup: (groupId: string) => void;
	selectEnvConfig: (envId: string) => void;
	selectEndpoint: (endpointId: string) => void;
	init: () => Promise<void>;
};

const initialState: DocaState = {
	doca: {
		id: "core",
		name: "Core API",
		version: "v2",
		desc: "Main application API. Users, articles, tags, comments — the full content layer.",
		tags: ["REST", "JSON", "Auth required"],
	},
	groups: [
		{
			id: "g-auth",
			label: "Authentication",
			endpoints: [
				{
					id: "users-list",
					method: "GET",
					path: "/users",
					name: "List all users",
					description:
						"Returns a paginated list of users. Results can be filtered, sorted, and searched. Requires an active Bearer token with the `users:read` scope.",
					tags: ["paginated", "auth-required"],
					auth: true,
					bodyParams: [],
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
				{
					id: "users-create",
					method: "POST",
					path: "/users",
					name: "Create a user",
					description:
						"Creates a new user account. Requires `users:write` scope. An email verification link is sent automatically after creation.",
					tags: ["auth-required"],
					auth: true,
					queryParams: [],
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
								{
									key: "message",
									type: "string",
									desc: "Human-readable message",
								},
							],
							example: `{\n  "error": "email_taken",\n  "message": "A user with this email already exists."\n}`,
						},
					},
				},
				{
					id: "articles-list",
					method: "GET",
					path: "/articles",
					name: "List articles",
					description:
						"Returns a paginated list of published articles. Filter by tag, author or date range. Anonymous access is allowed for public articles.",
					tags: ["paginated", "public"],
					auth: false,
					bodyParams: [],
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
								{
									key: "data[].excerpt",
									type: "string",
									desc: "Short description",
								},
								{
									key: "data[].author",
									type: "object",
									desc: "Author object with id, name",
								},
								{
									key: "data[].tags",
									type: "array",
									desc: "Array of tag objects",
								},
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
								{
									key: "message",
									type: "string",
									desc: "Human-readable message",
								},
							],
							example: `{\n  "error": "invalid_param",\n  "message": "status 'archived' is not allowed without admin scope."\n}`,
						},
					},
				},
				{
					id: "auth-token",
					method: "POST",
					path: "/auth/token",
					name: "Obtain access token",
					description:
						"Exchange user credentials for a short-lived access token and a long-lived refresh token. Access tokens expire after 60 minutes.",
					tags: ["public"],
					auth: false,
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
					queryParams: [],
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
								{
									key: "message",
									type: "string",
									desc: "Human-readable message",
								},
							],
							example: `{\n  "error": "invalid_credentials",\n  "message": "The email or password is incorrect."\n}`,
						},
					},
				},
			],
		},
	],
	schema: [
		{
			id: "user",
			name: "User",
			desc: "Represents a registered account on the platform. Users can author articles, post comments, and manage webhooks depending on their assigned role.",
			fields: [
				{
					name: "id",
					type: "uuid",
					req: true,
					nullable: false,
					desc: "Unique identifier",
					note: "UUIDv4 format",
					example: '"3fa85f64-5717-4562-b3fc"',
				},
				{
					name: "name",
					type: "string",
					req: true,
					nullable: false,
					desc: "Full display name",
					note: "Max 120 chars",
					example: '"Alice Smith"',
				},
				{
					name: "email",
					type: "string",
					req: true,
					nullable: false,
					desc: "Primary email address",
					note: "Unique across all users",
					example: '"alice@example.com"',
				},
				{
					name: "role",
					type: "enum",
					req: true,
					nullable: false,
					desc: "Access level assigned to the user",
					note: "See enum values below",
					example: '"editor"',
					enum: [
						{
							val: "admin",
							desc: "Full access — manage users, settings, all content",
						},
						{ val: "editor", desc: "Can create, edit, and publish articles" },
						{ val: "viewer", desc: "Read-only access to published content" },
					],
				},
				{
					name: "avatar_url",
					type: "string",
					req: false,
					nullable: true,
					desc: "URL to the user's profile picture",
					note: "CDN-hosted, HTTPS",
					example: '"https://cdn.example.com/..."',
				},
				{
					name: "bio",
					type: "string",
					req: false,
					nullable: true,
					desc: "Short user biography",
					note: "Max 300 chars. Markdown allowed",
					example: '"Laravel enthusiast..."',
				},
				{
					name: "email_verified",
					type: "boolean",
					req: true,
					nullable: false,
					desc: "Whether email has been verified",
					note: "",
					example: "true",
				},
				{
					name: "created_at",
					type: "datetime",
					req: true,
					nullable: false,
					desc: "ISO 8601 account creation timestamp",
					note: "UTC, read-only",
					example: '"2025-03-14T10:22:00Z"',
				},
				{
					name: "updated_at",
					type: "datetime",
					req: true,
					nullable: false,
					desc: "ISO 8601 last-modified timestamp",
					note: "UTC, read-only",
					example: '"2026-04-30T18:00:00Z"',
				},
			],
			usedBy: [
				{ method: "GET", path: "/users", role: "response[]" },
				{ method: "POST", path: "/users", role: "response" },
				{ method: "GET", path: "/users/{id}", role: "response" },
				{ method: "PUT", path: "/users/{id}", role: "response" },
				{ method: "GET", path: "/articles", role: "author field" },
			],
		},
		{
			id: "article",
			name: "Article",
			desc: "A documentation article or glossary entry written by a community member. Articles contain markdown body content and can be tagged, commented on, and rated.",
			fields: [
				{
					name: "id",
					type: "uuid",
					req: true,
					nullable: false,
					desc: "Unique identifier",
					note: "UUIDv4 format",
					example: '"a1b2c3d4-..."',
				},
				{
					name: "title",
					type: "string",
					req: true,
					nullable: false,
					desc: "Article headline",
					note: "Max 160 chars",
					example: '"The tap() Helper"',
				},
				{
					name: "slug",
					type: "string",
					req: true,
					nullable: false,
					desc: "URL-safe identifier derived from title",
					note: "Unique, auto-generated",
					example: '"the-tap-helper"',
				},
				{
					name: "excerpt",
					type: "string",
					req: true,
					nullable: false,
					desc: "Short plain-text summary",
					note: "Max 240 chars",
					example: '"Call a closure on a value..."',
				},
				{
					name: "body",
					type: "string",
					req: true,
					nullable: false,
					desc: "Full article content in Markdown",
					note: "Rendered client-side",
					example: '"## What it does\\n\\nThe tap() helper is..."',
				},
				{
					name: "status",
					type: "enum",
					req: true,
					nullable: false,
					desc: "Publication state of the article",
					note: "See enum values below",
					example: '"published"',
					enum: [
						{
							val: "draft",
							desc: "Not publicly visible. Accessible by author and admins only.",
						},
						{ val: "published", desc: "Publicly visible. Indexed by search." },
						{
							val: "archived",
							desc: "Hidden from listings but accessible by direct URL.",
						},
					],
				},
				{
					name: "level",
					type: "enum",
					req: true,
					nullable: false,
					desc: "Difficulty level for readers",
					note: "",
					example: '"beginner"',
					enum: [
						{ val: "beginner", desc: "No prior knowledge assumed" },
						{
							val: "intermediate",
							desc: "Familiarity with Laravel recommended",
						},
						{ val: "advanced", desc: "Deep framework knowledge required" },
					],
				},
				{
					name: "author",
					type: "object",
					req: true,
					nullable: false,
					desc: "Embedded User object (id, name, avatar)",
					note: "Partial — id and name only",
					example: '{ "id": "...", "name": "Alice" }',
				},
				{
					name: "tags",
					type: "array",
					req: true,
					nullable: false,
					desc: "Array of Tag objects attached to this article",
					note: "Empty array if untagged",
					example: '[{ "slug": "helpers" }]',
				},
				{
					name: "comment_count",
					type: "integer",
					req: true,
					nullable: false,
					desc: "Number of approved comments",
					note: "Read-only counter",
					example: "7",
				},
				{
					name: "published_at",
					type: "datetime",
					req: false,
					nullable: true,
					desc: "ISO 8601 publication timestamp",
					note: "null if still a draft",
					example: '"2026-03-14T10:00:00Z"',
				},
				{
					name: "updated_at",
					type: "datetime",
					req: true,
					nullable: false,
					desc: "ISO 8601 last-modified timestamp",
					note: "UTC, read-only",
					example: '"2026-04-30T18:00:00Z"',
				},
			],
			usedBy: [
				{ method: "GET", path: "/articles", role: "response[]" },
				{ method: "POST", path: "/articles", role: "response" },
				{ method: "GET", path: "/articles/{id}", role: "response" },
				{ method: "PATCH", path: "/articles/{id}", role: "response" },
				{
					method: "GET",
					path: "/articles/{id}/comments",
					role: "parent context",
				},
			],
		},
		{
			id: "tag",
			name: "Tag",
			desc: "A taxonomy label applied to articles. Tags help readers discover related content and are used for filtering in the catalog and search.",
			fields: [
				{
					name: "slug",
					type: "string",
					req: true,
					nullable: false,
					desc: "URL-safe unique identifier",
					note: "Lowercase, hyphens only",
					example: '"hidden-methods"',
				},
				{
					name: "name",
					type: "string",
					req: true,
					nullable: false,
					desc: "Human-readable display name",
					note: "Max 60 chars",
					example: '"Hidden Methods"',
				},
				{
					name: "description",
					type: "string",
					req: false,
					nullable: true,
					desc: "Optional description of what the tag covers",
					note: "Max 240 chars",
					example: '"Methods rarely documented..."',
				},
				{
					name: "color",
					type: "string",
					req: false,
					nullable: true,
					desc: "Hex color for UI display",
					note: "6-digit hex with #",
					example: '"#1E7E52"',
				},
				{
					name: "article_count",
					type: "integer",
					req: true,
					nullable: false,
					desc: "Number of published articles with this tag",
					note: "Read-only counter",
					example: "14",
				},
			],
			usedBy: [
				{ method: "GET", path: "/tags", role: "response[]" },
				{ method: "GET", path: "/tags/{slug}", role: "response" },
				{ method: "GET", path: "/articles", role: "tags field" },
				{ method: "GET", path: "/search", role: "filter param" },
			],
		},
		{
			id: "comment",
			name: "Comment",
			desc: "A community comment posted on an article. Comments support basic Markdown and are subject to moderation before appearing publicly.",
			fields: [
				{
					name: "id",
					type: "uuid",
					req: true,
					nullable: false,
					desc: "Unique identifier",
					note: "UUIDv4 format",
					example: '"c9d1e2f3-..."',
				},
				{
					name: "article_id",
					type: "uuid",
					req: true,
					nullable: false,
					desc: "UUID of the parent article",
					note: "References Article.id",
					example: '"a1b2c3d4-..."',
				},
				{
					name: "author",
					type: "object",
					req: true,
					nullable: false,
					desc: "Partial User object (id, name, avatar)",
					note: "Read-only",
					example: '{ "id": "...", "name": "Bob" }',
				},
				{
					name: "body",
					type: "string",
					req: true,
					nullable: false,
					desc: "Comment text in Markdown",
					note: "Max 2000 chars",
					example: '"Great explanation! I use tap() in..."',
				},
				{
					name: "status",
					type: "enum",
					req: true,
					nullable: false,
					desc: "Moderation state",
					note: "See enum values below",
					example: '"approved"',
					enum: [
						{
							val: "pending",
							desc: "Awaiting moderator review. Not publicly visible.",
						},
						{ val: "approved", desc: "Visible to all readers." },
						{
							val: "rejected",
							desc: "Rejected by moderator. Only visible to author.",
						},
					],
				},
				{
					name: "upvotes",
					type: "integer",
					req: true,
					nullable: false,
					desc: "Number of community upvotes",
					note: "Read-only counter",
					example: "12",
				},
				{
					name: "created_at",
					type: "datetime",
					req: true,
					nullable: false,
					desc: "ISO 8601 creation timestamp",
					note: "UTC, read-only",
					example: '"2026-04-01T09:15:00Z"',
				},
				{
					name: "updated_at",
					type: "datetime",
					req: true,
					nullable: false,
					desc: "ISO 8601 last-edited timestamp",
					note: "UTC, read-only",
					example: '"2026-04-01T10:00:00Z"',
				},
			],
			usedBy: [
				{ method: "GET", path: "/articles/{id}/comments", role: "response[]" },
				{ method: "POST", path: "/articles/{id}/comments", role: "response" },
				{ method: "DELETE", path: "/comments/{id}", role: "target" },
			],
		},
	],
	envConfigs: [
		{
			id: "1",
			env: "prod",
			label: "Prod",
			dot: "#1E7E52",
			baseUrl: "https://api.example.com",
		},
		{
			id: "2",
			env: "staging",
			label: "Staging",
			dot: "#2a1ad6",
			baseUrl: "https://api.example.com",
		},
		{
			id: "3",
			env: "local",
			label: "Local",
			dot: "#dd9716",
			baseUrl: "https://api.example.com",
		},
	],

	selectedGroup: null,
	selectedEnvConfig: null,
	selectedEndpoint: null,
};

export type DocaStore = DocaState & DocaActions;

const createDocaSlice: StateCreator<DocaStore> = (set, get) => ({
	...initialState,

	selectGroup: (groupId: string) => {
		const { groups } = get();

		if (!groups) return;
		set({
			selectedGroup: groups.find((endpoint) => endpoint.id === groupId),
		});
	},
	selectEnvConfig: (envId: string) => {
		const { envConfigs } = get();

		if (!envConfigs) return;
		set({ selectedEnvConfig: envConfigs.find((env) => env.id === envId) });
	},
	selectEndpoint: (endpointId: string) => {
		const { groups } = get();

		if (!groups) return;
		set({
			selectedEndpoint: groups
				.flatMap((group) => group.endpoints)
				.find((endpoint) => endpoint.id === endpointId),
		});
	},

	init: async () => {
		try {
			const db = await getDb();
			const ids = await readAllDocaIds(db);

			if (ids.length === 0) {
				const { doca, groups, schema, envConfigs } = get();
				if (!doca || !groups) return;
				await writeDoca(db, doca);
				await writeGroups(db, doca.id, groups);
				await writeSchemas(db, doca.id, schema);
				await writeEnvConfigs(db, doca.id, envConfigs);
			} else {
				const docaId = ids[0];
				const [doca, groups, schema, envConfigs] = await Promise.all([
					readDoca(db, docaId),
					readGroups(db, docaId),
					readSchemas(db, docaId),
					readEnvConfigs(db, docaId),
				]);
				set({ doca, groups, schema, envConfigs });
			}
		} catch (e) {
			console.error("[DocaStore] init failed:", e);
		}
	},
});

export const useDocaStore = create<DocaStore>()(
	devtools(createDocaSlice, {
		name: "DocaStore",
	}),
);
