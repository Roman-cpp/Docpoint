import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
	if (!_db) {
		_db = await Database.load("sqlite:docpoint.db");
	}
	return _db;
}
