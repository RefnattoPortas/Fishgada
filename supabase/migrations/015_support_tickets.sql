-- ============================================================
-- Fishgada Support & Feedback Module v1.0
-- ============================================================

-- 1. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_category') THEN
        CREATE TYPE support_category AS ENUM ('bug', 'sugestão', 'elogio', 'outro', 'suporte_tecnico', 'financeiro');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_status') THEN
        CREATE TYPE support_status AS ENUM ('aberto', 'em desenvolvimento', 'concluído');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_priority') THEN
        CREATE TYPE support_priority AS ENUM ('baixa', 'média', 'alta', 'urgente');
    END IF;
END $$;

-- 2. ADICIONAR CAMPO ADMIN AO PROFILE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 3. TABELA: support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category          support_category NOT NULL DEFAULT 'outro',
    subject           TEXT NOT NULL,
    description       TEXT NOT NULL,
    attachment_url    TEXT,
    status            support_status NOT NULL DEFAULT 'aberto',
    priority          support_priority NOT NULL DEFAULT 'média',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Usuários veem seus próprios tickets ou admins veem tudo
CREATE POLICY "Tickets visibility" ON public.support_tickets
    FOR SELECT USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- Usuários criam seus próprios tickets
CREATE POLICY "Tickets insertion" ON public.support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Somente admins podem atualizar tickets (mudar status, etc)
CREATE POLICY "Tickets update" ON public.support_tickets
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- 5. STORAGE: Bucket para anexos de suporte
-- Nota: Supabase storage buckets são gerenciados via storage schema
-- Tentamos criar via SQL, mas em alguns ambientes o trigger de cleanup pode estar ativo
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE RLS
CREATE POLICY "Support attachments insertion" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Support attachments viewing" ON storage.objects
    FOR SELECT USING (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');

-- 6. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ticket_updated
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_updated_at();
