CREATE TABLE IF NOT EXISTS entity_relation (
    id          TEXT PRIMARY KEY,
    from_entity TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    from_field  TEXT NOT NULL,   -- имя поля на стороне PK ("one")
    to_entity   TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    to_field    TEXT NOT NULL,   -- имя поля на стороне FK ("many")
    UNIQUE(from_entity, from_field, to_entity, to_field)
);
