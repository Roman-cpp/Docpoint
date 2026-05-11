import type Database from "@tauri-apps/plugin-sql";
import type { Doca } from "@/entities/doca";
import type { Group } from "@/entities/group";
import type { Endpoint } from "@/entities/endpoint";
import type { Schema } from "@/entities/schema";
import type { EnvConfig } from "@/entities/env-config";
import type {
	DbDoca,
	DbDocaTag,
	DbEndpoint,
	DbEndpointTag,
	DbEnvConfig,
	DbGroup,
	DbParam,
	DbResponse,
	DbResponseField,
	DbSchema,
	DbSchemaField,
	DbSchemaFieldEnum,
	DbSchemaUsedBy,
} from "./row-types";

export async function readDoca(db: Database, id: string): Promise<Doca | null> {
	const rows = await db.select<DbDoca[]>("SELECT * FROM doca WHERE id = ?", [id]);
	if (rows.length === 0) return null;

	const tagRows = await db.select<DbDocaTag[]>(
		"SELECT tag FROM doca_tag WHERE doca_id = ?",
		[id],
	);

	const row = rows[0];
	return {
		id: row.id,
		name: row.name,
		version: row.version,
		desc: row.desc,
		tags: tagRows.map((t) => t.tag),
	};
}

export async function readAllDocaIds(db: Database): Promise<string[]> {
	const rows = await db.select<{ id: string }[]>("SELECT id FROM doca");
	return rows.map((r) => r.id);
}

export async function readGroups(db: Database, docaId: string): Promise<Group[]> {
	const groupRows = await db.select<DbGroup[]>(
		"SELECT * FROM endpoint_group WHERE doca_id = ? ORDER BY sort_ord",
		[docaId],
	);
	if (groupRows.length === 0) return [];

	const groupIds = groupRows.map((g) => g.id);
	const placeholders = groupIds.map(() => "?").join(",");

	const endpointRows = await db.select<DbEndpoint[]>(
		`SELECT * FROM endpoint WHERE group_id IN (${placeholders}) ORDER BY sort_ord`,
		groupIds,
	);

	const endpointIds = endpointRows.map((e) => e.id);

	const [paramRows, tagRows, responseRows] = endpointIds.length
		? await Promise.all([
				db.select<DbParam[]>(
					`SELECT * FROM param WHERE endpoint_id IN (${endpointIds.map(() => "?").join(",")}) ORDER BY sort_ord`,
					endpointIds,
				),
				db.select<DbEndpointTag[]>(
					`SELECT * FROM endpoint_tag WHERE endpoint_id IN (${endpointIds.map(() => "?").join(",")})`,
					endpointIds,
				),
				db.select<DbResponse[]>(
					`SELECT * FROM response WHERE endpoint_id IN (${endpointIds.map(() => "?").join(",")})`,
					endpointIds,
				),
			])
		: [[], [], []];

	const responseIds = responseRows.map((r) => r.id);
	const responseFieldRows: DbResponseField[] = responseIds.length
		? await db.select<DbResponseField[]>(
				`SELECT * FROM response_field WHERE response_id IN (${responseIds.map(() => "?").join(",")}) ORDER BY sort_ord`,
				responseIds,
			)
		: [];

	const endpoints: Endpoint[] = endpointRows.map((e) => {
		const tags = tagRows.filter((t) => t.endpoint_id === e.id).map((t) => t.tag);
		const queryParams = paramRows
			.filter((p) => p.endpoint_id === e.id && p.kind === "query")
			.map((p) => ({
				name: p.name,
				type: p.type,
				required: Boolean(p.required),
				desc: p.desc,
				default: p.default_val ?? undefined,
			}));
		const bodyParams = paramRows
			.filter((p) => p.endpoint_id === e.id && p.kind === "body")
			.map((p) => ({
				name: p.name,
				type: p.type,
				required: Boolean(p.required),
				desc: p.desc,
				default: p.default_val ?? undefined,
			}));

		const responses: Endpoint["responses"] = {};
		for (const r of responseRows.filter((r) => r.endpoint_id === e.id)) {
			const fields = responseFieldRows
				.filter((f) => f.response_id === r.id)
				.map((f) => ({
					key: f.key,
					type: f.type,
					desc: f.desc,
					example: f.example ?? undefined,
				}));
			responses[r.status_code] = {
				label: r.label,
				schema: fields,
				example: r.example,
			};
		}

		return {
			id: e.id,
			method: e.method as Endpoint["method"],
			path: e.path,
			name: e.name,
			description: e.description,
			tags,
			auth: Boolean(e.auth),
			queryParams,
			bodyParams,
			responses,
		};
	});

	return groupRows.map((g) => ({
		id: g.id,
		label: g.label,
		endpoints: endpoints.filter((e) =>
			endpointRows.find((r) => r.id === e.id && r.group_id === g.id),
		),
	}));
}

export async function readSchemas(db: Database, docaId: string): Promise<Schema[]> {
	const schemaRows = await db.select<DbSchema[]>(
		"SELECT * FROM schema WHERE doca_id = ?",
		[docaId],
	);
	if (schemaRows.length === 0) return [];

	const schemaIds = schemaRows.map((s) => s.id);
	const placeholders = schemaIds.map(() => "?").join(",");

	const [fieldRows, usedByRows] = await Promise.all([
		db.select<DbSchemaField[]>(
			`SELECT * FROM schema_field WHERE schema_id IN (${placeholders}) ORDER BY sort_ord`,
			schemaIds,
		),
		db.select<DbSchemaUsedBy[]>(
			`SELECT * FROM schema_used_by WHERE schema_id IN (${placeholders})`,
			schemaIds,
		),
	]);

	const fieldIds = fieldRows.map((f) => f.id);
	const enumRows: DbSchemaFieldEnum[] = fieldIds.length
		? await db.select<DbSchemaFieldEnum[]>(
				`SELECT * FROM schema_field_enum WHERE field_id IN (${fieldIds.map(() => "?").join(",")})`,
				fieldIds,
			)
		: [];

	return schemaRows.map((s) => ({
		id: s.id,
		name: s.name,
		desc: s.desc,
		fields: fieldRows
			.filter((f) => f.schema_id === s.id)
			.map((f) => ({
				name: f.name,
				type: f.type,
				req: Boolean(f.required),
				nullable: Boolean(f.nullable),
				desc: f.desc,
				note: f.note,
				example: f.example,
				enum: enumRows.filter((e) => e.field_id === f.id).map((e) => ({
					val: e.val,
					desc: e.desc,
				})),
			})),
		usedBy: usedByRows
			.filter((u) => u.schema_id === s.id)
			.map((u) => ({ method: u.method, path: u.path, role: u.role })),
	}));
}

export async function readEnvConfigs(
	db: Database,
	docaId: string,
): Promise<EnvConfig[]> {
	const rows = await db.select<DbEnvConfig[]>(
		"SELECT * FROM env_config WHERE doca_id = ?",
		[docaId],
	);
	return rows.map((r) => ({
		id: r.id,
		env: r.env,
		label: r.label,
		baseUrl: r.base_url,
	}));
}
