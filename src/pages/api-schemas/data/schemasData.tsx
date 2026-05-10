import type { SchemaEntity } from "../model/types";

export const ENTITIES: SchemaEntity[] = [
	{
		id: "user",
		name: "User",
		icon: (color) => (
			<svg
				viewBox="0 0 22 22"
				fill="none"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
			>
				<circle cx="11" cy="7" r="4" />
				<path d="M3 19c0-4.418 3.582-8 8-8s8 3.582 8 8" />
			</svg>
		),
		iconColor: "#1E7E52",
		iconBg: "#EAF5EF",
		accent: "#1E7E52",
		tag: "Core API",
		tagBg: "#EAF5EF",
		tagColor: "#1E7E52",
		desc: "Represents a registered account on the platform. Users can author articles, post comments, and manage webhooks depending on their assigned role.",
		fieldCount: 9,
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
		jsonExample: `{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "role": "editor",
  "avatar_url": "https://cdn.example.com/avatars/alice.jpg",
  "bio": "Laravel enthusiast. Writing about hidden gems.",
  "email_verified": true,
  "created_at": "2025-03-14T10:22:00Z",
  "updated_at": "2026-04-30T18:00:00Z"
}`,
		usedBy: [
			{ method: "GET", path: "/users", role: "response[]" },
			{ method: "POST", path: "/users", role: "response" },
			{ method: "GET", path: "/users/{id}", role: "response" },
			{ method: "PUT", path: "/users/{id}", role: "response" },
			{ method: "GET", path: "/articles", role: "author field" },
		],
		stats: { fields: 9, required: 6, nullable: 2, enums: 1 },
	},
	{
		id: "article",
		name: "Article",
		icon: (color) => (
			<svg
				viewBox="0 0 22 22"
				fill="none"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
			>
				<rect x="3" y="2" width="16" height="18" rx="2.5" />
				<path d="M7 7h8M7 11h8M7 15h5" />
			</svg>
		),
		iconColor: "#1A5EA8",
		iconBg: "#EAF1FB",
		accent: "#1A5EA8",
		tag: "Core API",
		tagBg: "#EAF1FB",
		tagColor: "#1A5EA8",
		desc: "A documentation article or glossary entry written by a community member. Articles contain markdown body content and can be tagged, commented on, and rated.",
		fieldCount: 12,
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
					{ val: "intermediate", desc: "Familiarity with Laravel recommended" },
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
		jsonExample: `{
  "id": "a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "title": "The tap() Helper",
  "slug": "the-tap-helper",
  "excerpt": "Call a closure on a value and return the value itself.",
  "body": "## What it does\\n\\nThe tap() helper is...",
  "status": "published",
  "level": "beginner",
  "author": {
    "id": "3fa85f64-5717-4562-b3fc",
    "name": "Alex Kowalski",
    "avatar_url": "https://cdn.example.com/avatars/ak.jpg"
  },
  "tags": [
    { "slug": "helpers", "name": "Helpers" }
  ],
  "comment_count": 7,
  "published_at": "2026-03-14T10:00:00Z",
  "updated_at": "2026-04-30T18:00:00Z"
}`,
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
		stats: { fields: 12, required: 10, nullable: 1, enums: 2 },
	},
	{
		id: "tag",
		name: "Tag",
		icon: (color) => (
			<svg
				viewBox="0 0 22 22"
				fill="none"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
			>
				<path d="M3 3h8l8 8-8 8-8-8V3z" />
				<circle cx="8" cy="8" r="1.5" fill={color} stroke="none" />
			</svg>
		),
		iconColor: "#9A5F00",
		iconBg: "#FFF3DC",
		accent: "#9A5F00",
		tag: "Core API",
		tagBg: "#FFF3DC",
		tagColor: "#9A5F00",
		desc: "A taxonomy label applied to articles. Tags help readers discover related content and are used for filtering in the catalog and search.",
		fieldCount: 5,
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
		jsonExample: `{
  "slug": "hidden-methods",
  "name": "Hidden Methods",
  "description": "Methods that exist in Laravel but are rarely documented.",
  "color": "#1E7E52",
  "article_count": 14
}`,
		usedBy: [
			{ method: "GET", path: "/tags", role: "response[]" },
			{ method: "GET", path: "/tags/{slug}", role: "response" },
			{ method: "GET", path: "/articles", role: "tags field" },
			{ method: "GET", path: "/search", role: "filter param" },
		],
		stats: { fields: 5, required: 3, nullable: 2, enums: 0 },
	},
	{
		id: "comment",
		name: "Comment",
		icon: (color) => (
			<svg
				viewBox="0 0 22 22"
				fill="none"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
			>
				<path d="M3 5a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H8l-5 3V5z" />
			</svg>
		),
		iconColor: "#7A4F9A",
		iconBg: "#F3EAFB",
		accent: "#7A4F9A",
		tag: "Core API",
		tagBg: "#F3EAFB",
		tagColor: "#7A4F9A",
		desc: "A community comment posted on an article. Comments support basic Markdown and are subject to moderation before appearing publicly.",
		fieldCount: 8,
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
		jsonExample: `{
  "id": "c9d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
  "article_id": "a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "author": {
    "id": "3fa85f64-5717-4562-b3fc",
    "name": "Bob Jones",
    "avatar_url": "https://cdn.example.com/avatars/bob.jpg"
  },
  "body": "Great explanation! I use tap() in pipelines all the time.",
  "status": "approved",
  "upvotes": 12,
  "created_at": "2026-04-01T09:15:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}`,
		usedBy: [
			{ method: "GET", path: "/articles/{id}/comments", role: "response[]" },
			{ method: "POST", path: "/articles/{id}/comments", role: "response" },
			{ method: "DELETE", path: "/comments/{id}", role: "target" },
		],
		stats: { fields: 8, required: 7, nullable: 0, enums: 1 },
	},
];
