-- Recomeço App - Supabase Schema
-- Execute este arquivo no Supabase SQL Editor

-- =============================================
-- EXTENSÃO UUID
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA USERS (Administradores)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- =============================================
-- TABELA MENTORS (Responsáveis/Líderes)
-- =============================================
CREATE TABLE IF NOT EXISTS mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar mentores ativos
CREATE INDEX IF NOT EXISTS idx_mentors_active ON mentors(active);

-- =============================================
-- TABELA PEOPLE (Pessoas cadastradas)
-- =============================================
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_date DATE,
    decision_month TEXT,
    full_name TEXT NOT NULL,
    birth_date DATE,
    full_address TEXT,
    contact TEXT,
    gender TEXT,
    baptized BOOLEAN DEFAULT false,
    first_decision TEXT,
    disciple_status TEXT DEFAULT 'Em cuidado',
    final_decision TEXT DEFAULT 'Em acompanhamento',
    notes TEXT,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para filtros
CREATE INDEX IF NOT EXISTS idx_people_decision_date ON people(decision_date);
CREATE INDEX IF NOT EXISTS idx_people_decision_month ON people(decision_month);
CREATE INDEX IF NOT EXISTS idx_people_disciple_status ON people(disciple_status);
CREATE INDEX IF NOT EXISTS idx_people_first_decision ON people(first_decision);
CREATE INDEX IF NOT EXISTS idx_people_baptized ON people(baptized);
CREATE INDEX IF NOT EXISTS idx_people_created_at ON people(created_at);
CREATE INDEX IF NOT EXISTS idx_people_visitor_id ON people(visitor_id);

-- =============================================
-- TABELA PEOPLE_MENTORS (Relacionamento)
-- =============================================
CREATE TABLE IF NOT EXISTS people_mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(person_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_people_mentors_person_id ON people_mentors(person_id);
CREATE INDEX IF NOT EXISTS idx_people_mentors_mentor_id ON people_mentors(mentor_id);

-- =============================================
-- TABELA BACKUP_LOGS (Registro de backups)
-- =============================================
CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_month INTEGER NOT NULL,
    backup_year INTEGER NOT NULL,
    exported_by TEXT,
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_people INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(backup_month, backup_year)
);

CREATE INDEX IF NOT EXISTS idx_backup_logs_month_year ON backup_logs(backup_month, backup_year);

-- =============================================
-- FUNÇÃO PARA UPDATED_AT AUTOMÁTICO
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS DE UPDATED_AT
-- =============================================
DROP TRIGGER IF EXISTS update_people_updated_at ON people;
CREATE TRIGGER update_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mentors_updated_at ON mentors;
CREATE TRIGGER update_mentors_updated_at
    BEFORE UPDATE ON mentors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEW PARA BUSCAR PESSOAS COM RESPONSÁVEIS
-- =============================================
CREATE OR REPLACE VIEW v_people_with_mentors AS
SELECT 
    p.id,
    p.decision_date,
    p.decision_month,
    p.full_name,
    p.birth_date,
    p.full_address,
    p.contact,
    p.gender,
    p.baptized,
    p.first_decision,
    p.disciple_status,
    p.final_decision,
    p.notes,
    p.visitor_id,
    p.created_at,
    p.updated_at,
    STRING_AGG(DISTINCT m.full_name, ', ' ORDER BY m.full_name) AS mentors
FROM people p
LEFT JOIN people_mentors pm ON p.id = pm.person_id
LEFT JOIN mentors m ON pm.mentor_id = m.id AND m.active = true
GROUP BY p.id;

-- =============================================
-- TABELA VISITORS (Visitantes)
-- =============================================
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_date DATE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    whatsapp TEXT,
    notes TEXT,
    sent_to_recomeco BOOLEAN DEFAULT false,
    recomeco_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_visit_date ON visitors(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitors_whatsapp ON visitors(whatsapp);
CREATE INDEX IF NOT EXISTS idx_visitors_sent_to_recomeco ON visitors(sent_to_recomeco);

DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
CREATE TRIGGER update_visitors_updated_at
    BEFORE UPDATE ON visitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on visitors" ON visitors FOR ALL USING (true);

-- =============================================
-- TABELA MEMBERS (Membros)
-- =============================================
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_type TEXT NOT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    cpf TEXT,
    birth_date DATE,
    phone TEXT,
    full_address TEXT,
    zip_code TEXT,
    street TEXT,
    address_number TEXT,
    address_complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    marital_status TEXT,
    gds TEXT,
    is_leadership BOOLEAN DEFAULT false,
    baptized BOOLEAN DEFAULT false,
    allergy TEXT,
    responsible_name TEXT,
    responsible_contact TEXT,
    child_gds TEXT,
    child_allergy TEXT,
    member_status TEXT DEFAULT 'Ativo',
    care_status TEXT DEFAULT 'Sem cuidado ativo',
    source TEXT DEFAULT 'Cadastro público',
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);
CREATE INDEX IF NOT EXISTS idx_members_birth_date ON members(birth_date);
CREATE INDEX IF NOT EXISTS idx_members_member_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_member_status ON members(member_status);
CREATE INDEX IF NOT EXISTS idx_members_baptized ON members(baptized);
CREATE INDEX IF NOT EXISTS idx_members_gds ON members(gds);
CREATE INDEX IF NOT EXISTS idx_members_child_gds ON members(child_gds);
CREATE INDEX IF NOT EXISTS idx_members_is_leadership ON members(is_leadership);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_members_person_id ON members(person_id);
CREATE INDEX IF NOT EXISTS idx_members_visitor_id ON members(visitor_id);

DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on members" ON members FOR ALL USING (true);

COMMENT ON TABLE members IS 'Tabela de membros do Ministério Recomeço.Adultos e crianças em acompanhamento.';
COMMENT ON COLUMN members.cpf IS 'CPF do membro. Este campo contém dados sensíveis e não deve aparecer completo em listas públicas ou exports.';

-- =============================================
-- POLICIES DE SEGURANÇA (Row Level Security)
-- =============================================
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para desenvolvimento (ajustar para produção)
CREATE POLICY "Allow all on people" ON people FOR ALL USING (true);
CREATE POLICY "Allow all on mentors" ON mentors FOR ALL USING (true);
CREATE POLICY "Allow all on people_mentors" ON people_mentors FOR ALL USING (true);
CREATE POLICY "Allow all on backup_logs" ON backup_logs FOR ALL USING (true);

-- Users table - apenas leitura para autenticação
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow auth on users" ON users FOR SELECT USING (true);

-- =============================================
-- ATUALIZAÇÕES PARA visitor_id em people
-- (Adicionar coluna em databases existentes)
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'people' AND column_name = 'visitor_id') THEN
        ALTER TABLE people ADD COLUMN visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_people_visitor_id ON people(visitor_id);