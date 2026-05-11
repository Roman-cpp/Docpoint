import type Database from "@tauri-apps/plugin-sql";
import type { Doca } from "@/entities/doca";
import type { Group } from "@/entities/group";
import type { Schema } from "@/entities/schema";
import type { EnvConfig } from "@/entities/env-config";

export async function writeDoca(db: Database, doca: Doca): Promise<void> {
	await db.execute(
		"INSERT OR REPLACE INTO doca (id, name, version, desc) VALUES (?, ?, ?, ?)",
		[doca.id, doca.name, doca.version, doca.desc],
	);
	await db.execute("DELETE FROM doca_tag WHERE doca_id = ?", [doca.id]);
	for (const tag of doca.tags) {
		await db.execute("INSERT INTO doca_tag (doca_id, tag) VALUES (?, ?)", [
			doca.id,
			tag,
		]);
	}
}

export async function writeGroups(
	db: Database,
	docaId: string,
	groups: Group[],
): Promise<void> {
	await db.execute(
		"DELETE FROM endpoint_group WHERE doca_id = ?",
		[docaId],
	);

	for (let gi = 0; gi < groups.length; gi++) {
		const g = groups[gi];
		await db.execute(
			"INSERT INTO endpoint_group (id, doca_id, label, sort_ord) VALUES (?, ?, ?, ?)",
			[g.id, docaId, g.label, gi],
		);

		for (let ei = 0; ei < g.endpoints.length; ei++) {
			const e = g.endpoints[ei];
			await db.execute(
				`INSERT INTO endpoint
         (id, group_id, method, path, name, description, auth, sort_ord)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[e.id, g.id, e.method, e.path, e.name, e.description, e.auth ? 1 : 0, ei],
			);

			for (const tag of e.tags) {
				await db.execute(
					"INSERT INTO endpoint_tag (endpoint_id, tag) VALUES (?, ?)",
					[e.id, tag],
				);
			}

			for (let pi = 0; pi < e.queryParams.length; pi++) {
				const p = e.queryParams[pi];
				await db.execute(
					`INSERT INTO param (endpoint_id, kind, name, type, required, desc, default_val, sort_ord)
           VALUES (?, 'query', ?, ?, ?, ?, ?, ?)`,
					[e.id, p.name, p.type, p.required ? 1 : 0, p.desc, p.default ?? null, pi],
				);
			}

			for (let pi = 0; pi < e.bodyParams.length; pi++) {
				const p = e.bodyParams[pi];
				await db.execute(
					`INSERT INTO param (endpoint_id, kind, name, type, required, desc, default_val, sort_ord)
           VALUES (?, 'body', ?, ?, ?, ?, ?, ?)`,
					[e.id, p.name, p.type, p.required ? 1 : 0, p.desc, p.default ?? null, pi],
				);
			}

			for (const [code, resp] of Object.entries(e.responses)) {
				const result = await db.execute(
					`INSERT INTO response (endpoint_id, status_code, label, example)
           VALUES (?, ?, ?, ?)`,
					[e.id, code, resp.label, resp.example],
				);
				const responseId = result.lastInsertId;

				for (let fi = 0; fi < resp.schema.length; fi++) {
					const f = resp.schema[fi];
					await db.execute(
						`INSERT INTO response_field (response_id, key, type, desc, example, sort_ord)
             VALUES (?, ?, ?, ?, ?, ?)`,
						[responseId, f.key, f.type, f.desc, f.example ?? null, fi],
					);
				}
			}
		}
	}
}

export async function writeSchemas(
	db: Database,
	docaId: string,
	schemas: Schema[],
): Promise<void> {
	await db.execute("DELETE FROM schema WHERE doca_id = ?", [docaId]);

	for (const s of schemas) {
		await db.execute(
			"INSERT INTO schema (id, doca_id, name, desc) VALUES (?, ?, ?, ?)",
			[s.id, docaId, s.name, s.desc],
		);

		for (let fi = 0; fi < s.fields.length; fi++) {
			const f = s.fields[fi];
			const result = await db.execute(
				`INSERT INTO schema_field
         (schema_id, name, type, required, nullable, desc, note, example, sort_ord)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					s.id, f.name, f.type,
					f.req ? 1 : 0, f.nullable ? 1 : 0,
					f.desc, f.note, f.example, fi,
				],
			);
			const fieldId = result.lastInsertId;

			if (f.enum) {
				for (const e of f.enum) {
					await db.execute(
						"INSERT INTO schema_field_enum (field_id, val, desc) VALUES (?, ?, ?)",
						[fieldId, e.val, e.desc],
					);
				}
			}
		}

		for (const u of s.usedBy) {
			await db.execute(
				"INSERT INTO schema_used_by (schema_id, method, path, role) VALUES (?, ?, ?, ?)",
				[s.id, u.method, u.path, u.role],
			);
		}
	}
}

export async function writeEnvConfigs(
	db: Database,
	docaId: string,
	configs: EnvConfig[],
): Promise<void> {
	await db.execute("DELETE FROM env_config WHERE doca_id = ?", [docaId]);
	for (const c of configs) {
		await db.execute(
			"INSERT INTO env_config (id, doca_id, env, label, base_url) VALUES (?, ?, ?, ?, ?)",
			[c.id, docaId, c.env, c.label, c.baseUrl],
		);
	}
}
