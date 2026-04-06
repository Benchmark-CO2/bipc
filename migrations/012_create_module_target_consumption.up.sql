BEGIN;

CREATE TABLE IF NOT EXISTS module_target_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    role_id UUID NOT NULL,
    option_id UUID NOT NULL,
    co2_min FLOAT8 NOT NULL DEFAULT 0,
    co2_max FLOAT8 NOT NULL DEFAULT 0,
    energy_min FLOAT8 NOT NULL DEFAULT 0,
    energy_max FLOAT8 NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_module_target_consumption_module 
        FOREIGN KEY (module_id) REFERENCES module(id) ON DELETE CASCADE,
    CONSTRAINT fk_module_target_consumption_option 
        FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE,
    CONSTRAINT check_module_target_consumption_type 
        CHECK (target_type IN ('floor', 'unit'))
);

CREATE UNIQUE INDEX module_target_consumption_module_target_unique 
    ON module_target_consumption(module_id, target_id);

CREATE INDEX idx_module_target_consumption_target 
    ON module_target_consumption(target_id, target_type);

CREATE INDEX idx_module_target_consumption_option 
    ON module_target_consumption(option_id);

CREATE INDEX idx_module_target_consumption_role 
    ON module_target_consumption(role_id);

INSERT INTO module_target_consumption (module_id, target_id, target_type, role_id, option_id, co2_min, co2_max, energy_min, energy_max)
SELECT 
    m.id AS module_id,
    f.id AS target_id,
    'floor' AS target_type,
    o.role_id,
    m.option_id,
    COALESCE(m.total_co2_min / NULLIF(f.area, 0), 0) AS co2_min,
    COALESCE(m.total_co2_max / NULLIF(f.area, 0), 0) AS co2_max,
    COALESCE(m.total_energy_min / NULLIF(f.area, 0), 0) AS energy_min,
    COALESCE(m.total_energy_max / NULLIF(f.area, 0), 0) AS energy_max
FROM module m
INNER JOIN module_application ma ON m.id = ma.module_id
INNER JOIN floor f ON ma.floor_id = f.id
INNER JOIN options o ON m.option_id = o.id
WHERE ma.floor_id IS NOT NULL;

INSERT INTO module_target_consumption (module_id, target_id, target_type, role_id, option_id, co2_min, co2_max, energy_min, energy_max)
SELECT 
    m.id AS module_id,
    u.id AS target_id,
    'unit' AS target_type,
    o.role_id,
    m.option_id,
    COALESCE(m.total_co2_min / NULLIF(unit_areas.total_area, 0), 0) AS co2_min,
    COALESCE(m.total_co2_max / NULLIF(unit_areas.total_area, 0), 0) AS co2_max,
    COALESCE(m.total_energy_min / NULLIF(unit_areas.total_area, 0), 0) AS energy_min,
    COALESCE(m.total_energy_max / NULLIF(unit_areas.total_area, 0), 0) AS energy_max
FROM module m
INNER JOIN module_application ma ON m.id = ma.module_id
INNER JOIN units u ON ma.unit_id = u.id
INNER JOIN options o ON m.option_id = o.id
INNER JOIN (
    SELECT unit_id, SUM(area) as total_area
    FROM floor
    GROUP BY unit_id
) unit_areas ON u.id = unit_areas.unit_id
WHERE ma.unit_id IS NOT NULL;

COMMIT;
