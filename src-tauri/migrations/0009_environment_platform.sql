ALTER TABLE environments ADD COLUMN platform_id TEXT REFERENCES platforms(id) ON DELETE SET NULL;
