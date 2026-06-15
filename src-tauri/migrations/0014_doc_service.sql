-- Re-home docs from platforms onto services. A doc now belongs to a single
-- microservice; its platform is derived through services.platform_id.
ALTER TABLE docs DROP COLUMN platform_id;
ALTER TABLE docs ADD COLUMN service_id TEXT REFERENCES services(id) ON DELETE SET NULL;
