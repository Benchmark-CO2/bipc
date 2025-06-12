CREATE DOMAIN cep_br AS TEXT CHECK (VALUE ~ '^[0-9]{5}-[0-9]{3}$');

CREATE TYPE state_br AS ENUM (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
);

CREATE TYPE project_phase AS ENUM (
    'estudo_preliminar',
    'anteprojeto',
    'projeto_basico',
    'projeto_executivo',
    'liberado_para_obra'
);

CREATE TABLE IF NOT EXISTS projects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    -- Versioning column to trigger projects_updated_at
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name citext NOT NULL,
    cep cep_br NOT NULL,
    state state_br NOT NULL,
    city TEXT NOT NULL,
    phase project_phase NOT NULL,
    description TEXT,
    image_url TEXT DEFAULT NULL,
    UNIQUE (user_id, name)
);

CREATE OR REPLACE FUNCTION projects_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION projects_set_updated_at();

COMMENT ON TABLE projects IS 'Tabela de projetos dos usuários';
COMMENT ON COLUMN projects.id IS 'ID do projeto';
COMMENT ON COLUMN projects.created_at IS 'Data de criação';
COMMENT ON COLUMN projects.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN projects.version IS 'Versão do projeto, usada para triggers de atualização';
COMMENT ON COLUMN projects.user_id IS 'ID do usuário proprietário do projeto';
COMMENT ON COLUMN projects.name IS 'Nome do projeto';
COMMENT ON COLUMN projects.cep IS 'CEP no formato 00000-000';
COMMENT ON COLUMN projects.state IS 'Sigla do estado (UF)';
COMMENT ON COLUMN projects.city IS 'Nome da cidade';
COMMENT ON COLUMN projects.phase IS 'Fase do projeto';
COMMENT ON COLUMN projects.description IS 'Descrição do projeto (opcional)';
COMMENT ON COLUMN projects.image_url IS 'URL da imagem do projeto (opcional)';
