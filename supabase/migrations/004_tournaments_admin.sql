-- ============================================================
-- Fishgada Tournaments & Resort Admin Extension v1.3
-- ============================================================

-- 1. ADICIONAR CAMPOS À fishing_resorts
ALTER TABLE public.fishing_resorts 
ADD COLUMN IF NOT EXISTS active_highlight TEXT, -- "O que está batendo"
ADD COLUMN IF NOT EXISTS notice_board     TEXT; -- Mural de avisos/promoções

-- 2. TABELA: tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resort_id         UUID NOT NULL REFERENCES public.fishing_resorts(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    description       TEXT,
    event_date        TIMESTAMPTZ NOT NULL,
    entry_fee         NUMERIC(10,2) DEFAULT 0.00,
    rules             TEXT,
    status            TEXT DEFAULT 'open' CHECK (status IN ('open', 'ongoing', 'closed')),
    max_participants  INTEGER,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Torneios visíveis a todos" ON public.tournaments
    FOR SELECT USING (TRUE);

CREATE POLICY "Donos de resort gerenciam seus torneios" ON public.tournaments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.fishing_resorts fr
            JOIN public.spots s ON s.id = fr.spot_id
            WHERE fr.id = tournaments.resort_id AND s.user_id = auth.uid()
        )
    );

-- 3. TABELA: tournament_participants (Check-in e Ranking)
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id     UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    checked_in        BOOLEAN DEFAULT FALSE,
    points            INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- RLS para Tournament Participants
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes visíveis a todos" ON public.tournament_participants
    FOR SELECT USING (TRUE);

CREATE POLICY "Usuário faz sua própria inscrição" ON public.tournament_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário ou dono de resort atualiza participação" ON public.tournament_participants
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.tournaments t
            JOIN public.fishing_resorts fr ON fr.id = t.resort_id
            JOIN public.spots s ON s.id = fr.spot_id
            WHERE t.id = tournament_participants.tournament_id AND s.user_id = auth.uid()
        )
    );

-- 4. ATUALIZAR VIEW DE MAPA (spots_map_view) PARA INCLUIR HIGHLIGHTS
DROP VIEW IF EXISTS public.spots_map_view;

CREATE OR REPLACE VIEW public.spots_map_view AS
SELECT
    s.id,
    s.user_id,
    s.title,
    s.description,
    s.privacy_level,
    s.fuzz_radius_m,
    s.water_type,
    s.is_verified,
    s.verification_count,
    s.community_unlock_captures,
    s.created_at,
    ST_X(s.location_fuzzed::geometry) AS display_lng,
    ST_Y(s.location_fuzzed::geometry) AS display_lat,
    ST_X(s.location::geometry)        AS exact_lng,
    ST_Y(s.location::geometry)        AS exact_lat,
    (SELECT COUNT(*) FROM public.captures c WHERE c.spot_id = s.id) AS total_captures,
    (SELECT se.lure_type FROM public.setups se
     JOIN public.captures ca ON ca.id = se.capture_id
     WHERE ca.spot_id = s.id ORDER BY ca.captured_at DESC LIMIT 1) AS latest_lure_type,
    p.display_name AS owner_name,
    p.avatar_url   AS owner_avatar,
    -- Dados de Pesqueiro
    fr.id              AS resort_id,
    fr.id IS NOT NULL  AS is_resort,
    fr.is_partner      AS is_resort_partner,
    fr.infrastructure  AS resort_infrastructure,
    fr.active_highlight AS resort_active_highlight,
    fr.notice_board    AS resort_notice_board,
    fr.opening_hours,
    fr.phone,
    fr.instagram,
    fr.website,
    fr.prices          AS resort_prices,
    fr.main_species    AS resort_main_species,
    -- Agregação de espécies capturadas para busca/filtro
    (SELECT STRING_AGG(DISTINCT species, ' ') FROM public.captures WHERE spot_id = s.id) AS searchable_species,
    -- Contagem de torneios abertos
    (SELECT COUNT(*) FROM public.tournaments t WHERE t.resort_id = fr.id AND t.status = 'open') AS open_tournaments_count
FROM public.spots s
JOIN public.profiles p ON p.id = s.user_id
LEFT JOIN public.fishing_resorts fr ON fr.spot_id = s.id
WHERE s.is_active = TRUE;
