CREATE OR REPLACE FUNCTION ensure_single_in_use_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.in_use = TRUE THEN
        EXECUTE format('UPDATE %I SET in_use = false WHERE id = $1 AND version != $2', TG_TABLE_NAME)
        USING NEW.id, NEW.version;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_in_use_beam_column
BEFORE INSERT OR UPDATE ON module_beam_column
FOR EACH ROW
EXECUTE FUNCTION ensure_single_in_use_version();

CREATE TRIGGER trg_ensure_single_in_use_concrete_wall
BEFORE INSERT OR UPDATE ON module_concrete_wall
FOR EACH ROW
EXECUTE FUNCTION ensure_single_in_use_version();