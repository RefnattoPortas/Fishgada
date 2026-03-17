-- ============================================================
-- WikiFish Database Migration v1.0
-- Plataforma de Pesca Esportiva com PostGIS + RLS + Gamificação
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- para buscas de texto fuzzy

-- ============================================================
-- TABELA: profiles (complementa auth.users do Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username          TEXT UNIQUE NOT NULL,
    display_name      TEXT,
    avatar_url        TEXT,
    bio               TEXT,
    total_captures    INT DEFAULT 0,
    total_spots       INT DEFAULT 0,
    xp_points         INT DEFAULT 0,             -- gamificação
    level             INT DEFAULT 1,             -- nível do pescador
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: spots (Pontos de Pesca)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spots (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Localização via PostGIS
    location          GEOGRAPHY(POINT, 4326) NOT NULL,
    location_fuzzed   GEOGRAPHY(POINT, 4326),   -- coordenada com "fuzzing" para pontos comunitários protegidos
    fuzz_radius_m     INT DEFAULT 0,             -- raio do fuzzing em metros (0 = sem fuzzing)

    title             TEXT NOT NULL,
    description       TEXT,

    -- Privacidade: public = visível a todos | community = via heatmap/fuzzing | private = só o dono
    privacy_level     TEXT NOT NULL DEFAULT 'public'
                          CHECK (privacy_level IN ('public', 'community', 'private')),

    -- Restrição de acesso comunitário (quantas capturas o usuário precisa ter para ver o pin exato)
    community_unlock_captures INT DEFAULT 5,

    -- Metadados do local
    water_type        TEXT CHECK (water_type IN ('river', 'lake', 'reservoir', 'sea', 'estuary', 'other')),
    depth_m           DECIMAL(6,2),
    access_difficulty TEXT CHECK (access_difficulty IN ('easy', 'medium', 'hard', 'boat_only')),
    photo_url         TEXT,

    -- Verificação comunitária
    is_verified       BOOLEAN DEFAULT FALSE,
    verification_count INT DEFAULT 0,

    -- Status
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índice espacial para queries de proximidade
CREATE INDEX IF NOT EXISTS spots_location_idx ON public.spots USING GIST (location);
CREATE INDEX IF NOT EXISTS spots_location_fuzzed_idx ON public.spots USING GIST (location_fuzzed);
CREATE INDEX IF NOT EXISTS spots_user_id_idx ON public.spots (user_id);
CREATE INDEX IF NOT EXISTS spots_privacy_idx ON public.spots (privacy_level);

-- ============================================================
-- TABELA: captures (Logs de Captura)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.captures (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    spot_id           UUID REFERENCES public.spots(id) ON DELETE SET NULL,

    -- Dados do peixe
    species           TEXT NOT NULL,             -- espécie do peixe
    weight_kg         DECIMAL(8,3),             -- peso em kg
    length_cm         DECIMAL(6,1),             -- comprimento em cm
    photo_url         TEXT,
    is_trophy         BOOLEAN DEFAULT FALSE,     -- peixe troféu?
    was_released      BOOLEAN DEFAULT TRUE,      -- pesca e solta?

    -- Data/hora da captura
    captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Condições climáticas e ambientais
    moon_phase        TEXT CHECK (moon_phase IN ('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
                                                   'full', 'waning_gibbous', 'last_quarter', 'waning_crescent')),
    temperature_c     DECIMAL(5,2),             -- temperatura do ar aprox.
    water_temp_c      DECIMAL(5,2),             -- temperatura da água aprox.
    weather           TEXT CHECK (weather IN ('sunny', 'cloudy', 'rainy', 'windy', 'foggy', 'stormy')),
    wind_speed_kmh    INT,
    water_clarity     TEXT CHECK (water_clarity IN ('clear', 'murky', 'dirty')),
    tide              TEXT CHECK (tide IN ('low', 'rising', 'high', 'falling')),  -- para pesca em mar
    time_of_day       TEXT CHECK (time_of_day IN ('dawn', 'morning', 'afternoon', 'dusk', 'night')),

    -- Gamificação: pontos ganhos por esta captura
    xp_awarded        INT DEFAULT 10,

    -- Privacidade herdada do spot
    is_public         BOOLEAN DEFAULT TRUE,

    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS captures_user_id_idx ON public.captures (user_id);
CREATE INDEX IF NOT EXISTS captures_spot_id_idx ON public.captures (spot_id);
CREATE INDEX IF NOT EXISTS captures_species_idx ON public.captures USING GIN (to_tsvector('portuguese', species));
CREATE INDEX IF NOT EXISTS captures_captured_at_idx ON public.captures (captured_at DESC);

-- ============================================================
-- TABELA: setups (Equipamento vinculado a uma captura)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.setups (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capture_id        UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Isca
    lure_type         TEXT CHECK (lure_type IN (
                          'topwater',       -- superfície
                          'mid_water',      -- meia-água
                          'bottom',         -- fundo
                          'jig',
                          'soft_plastic',
                          'crankbait',
                          'spinnerbait',
                          'natural_bait',   -- isca natural
                          'fly',            -- mosca
                          'other'
                      )),
    lure_model        TEXT,                 -- modelo/nome da isca
    lure_color        TEXT,                 -- cor da isca
    lure_size_cm      DECIMAL(5,1),         -- tamanho em cm
    lure_brand        TEXT,

    -- Anzol
    hook_size         TEXT,                 -- ex: "4/0", "2", "#8"
    hook_type         TEXT CHECK (hook_type IN ('circle', 'j_hook', 'treble', 'offset', 'wide_gap', 'other')),

    -- Linha
    line_lb           DECIMAL(6,1),         -- libragem da linha
    line_type         TEXT CHECK (line_type IN ('mono', 'fluorocarbon', 'braid', 'wire')),
    line_brand        TEXT,

    -- Equipamento completo
    rod_brand         TEXT,
    rod_model         TEXT,
    reel_brand        TEXT,
    reel_model        TEXT,

    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS setups_capture_id_idx ON public.setups (capture_id);
CREATE INDEX IF NOT EXISTS setups_user_id_idx ON public.setups (user_id);
CREATE INDEX IF NOT EXISTS setups_lure_type_idx ON public.setups (lure_type);
CREATE INDEX IF NOT EXISTS setups_species_join_idx ON public.setups (capture_id); -- para query "setup por espécie"

-- ============================================================
-- TABELA: interactions (Curtidas e comentários — gamificação)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.interactions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    capture_id        UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,

    type              TEXT NOT NULL CHECK (type IN ('like', 'comment', 'verified')),
    comment_text      TEXT,                 -- preenchido quando type = 'comment'

    created_at        TIMESTAMPTZ DEFAULT NOW(),

    -- Garante que um usuário só curte uma vez por captura
    UNIQUE (user_id, capture_id, type)
);

CREATE INDEX IF NOT EXISTS interactions_capture_id_idx ON public.interactions (capture_id);
CREATE INDEX IF NOT EXISTS interactions_user_id_idx ON public.interactions (user_id);

-- ============================================================
-- TABELA: spot_verifications (votação comunitária de spots)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spot_verifications (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_id           UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_confirmed      BOOLEAN NOT NULL,    -- true = confirma que o spot é legítimo
    note              TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (spot_id, user_id)
);

-- ============================================================
-- FUNÇÃO: calcular localização com fuzzing
-- Desloca o ponto por um offset aleatório dentro do raio especificado
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_location_fuzz(
    original_point GEOGRAPHY,
    radius_m       INT
) RETURNS GEOGRAPHY AS $$
DECLARE
    random_angle   FLOAT;
    random_dist    FLOAT;
    fuzz_lat       FLOAT;
    fuzz_lon       FLOAT;
    orig_lat       FLOAT;
    orig_lon       FLOAT;
BEGIN
    IF radius_m = 0 THEN
        RETURN original_point;
    END IF;

    orig_lat := ST_Y(original_point::geometry);
    orig_lon := ST_X(original_point::geometry);

    random_angle := random() * 2 * PI();
    random_dist  := random() * radius_m;

    -- deslocamento em graus (aproximação: 1 grau lat ≈ 111000m)
    fuzz_lat := orig_lat + (random_dist * COS(random_angle)) / 111000.0;
    fuzz_lon := orig_lon + (random_dist * SIN(random_angle)) / (111000.0 * COS(RADIANS(orig_lat)));

    RETURN ST_SetSRID(ST_MakePoint(fuzz_lon, fuzz_lat), 4326)::GEOGRAPHY;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================================
-- TRIGGER: ao criar/atualizar spot, calcular location_fuzzed automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_fuzz_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.privacy_level = 'community' AND NEW.fuzz_radius_m > 0 THEN
        NEW.location_fuzzed := public.apply_location_fuzz(NEW.location, NEW.fuzz_radius_m);
    ELSE
        NEW.location_fuzzed := NEW.location;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spots_fuzz_location
    BEFORE INSERT OR UPDATE ON public.spots
    FOR EACH ROW EXECUTE FUNCTION public.trigger_fuzz_location();

-- ============================================================
-- FUNÇÃO: verificar se usuário tem acesso ao pin exato do spot comunitário
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_user_see_exact_spot(
    p_user_id UUID,
    p_spot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    spot_record      public.spots%ROWTYPE;
    user_captures    INT;
BEGIN
    SELECT * INTO spot_record FROM public.spots WHERE id = p_spot_id;

    -- Dono sempre vê o pin exato
    IF spot_record.user_id = p_user_id THEN RETURN TRUE; END IF;

    -- Spots públicos: todos veem
    IF spot_record.privacy_level = 'public' THEN RETURN TRUE; END IF;

    -- Spots privados: só o dono
    IF spot_record.privacy_level = 'private' THEN RETURN FALSE; END IF;

    -- Spots comunitários: verifica número de capturas do usuário
    SELECT COUNT(*) INTO user_captures
    FROM public.captures
    WHERE user_id = p_user_id AND is_public = TRUE;

    RETURN user_captures >= spot_record.community_unlock_captures;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: atualizar contadores no profile após captura
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles
        SET total_captures = total_captures + 1,
            xp_points      = xp_points + NEW.xp_awarded,
            updated_at     = NOW()
        WHERE id = NEW.user_id;

        -- Level up a cada 500 XP (simples por ora)
        UPDATE public.profiles
        SET level = GREATEST(1, FLOOR(xp_points / 500) + 1)
        WHERE id = NEW.user_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles
        SET total_captures = GREATEST(0, total_captures - 1),
            updated_at     = NOW()
        WHERE id = OLD.user_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER captures_update_profile_stats
    AFTER INSERT OR DELETE ON public.captures
    FOR EACH ROW EXECUTE FUNCTION public.trigger_update_profile_stats();

-- ============================================================
-- TRIGGER: atualizar contadores de spots no profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_update_spot_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles SET total_spots = total_spots + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles SET total_spots = GREATEST(0, total_spots - 1) WHERE id = OLD.user_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spots_update_spot_count
    AFTER INSERT OR DELETE ON public.spots
    FOR EACH ROW EXECUTE FUNCTION public.trigger_update_spot_count();

-- ============================================================
-- TRIGGER: atualizar verification_count no spot
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_update_spot_verification()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.spots
    SET verification_count = (
            SELECT COUNT(*) FROM public.spot_verifications
            WHERE spot_id = COALESCE(NEW.spot_id, OLD.spot_id) AND is_confirmed = TRUE
        ),
        is_verified = (
            SELECT COUNT(*) >= 3 FROM public.spot_verifications
            WHERE spot_id = COALESCE(NEW.spot_id, OLD.spot_id) AND is_confirmed = TRUE
        )
    WHERE id = COALESCE(NEW.spot_id, OLD.spot_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spot_verifications_update_count
    AFTER INSERT OR UPDATE OR DELETE ON public.spot_verifications
    FOR EACH ROW EXECUTE FUNCTION public.trigger_update_spot_verification();

-- ============================================================
-- VIEW: spots com dados para o mapa (resolve fuzzing automaticamente)
-- Atenção: a RLS abaixo controla o que cada usuário vê
-- ============================================================
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
    -- Coordenada exibida (pode ser o ponto fuzzed ou o real, dependendo da lógica da app)
    ST_X(s.location_fuzzed::geometry) AS display_lng,
    ST_Y(s.location_fuzzed::geometry) AS display_lat,
    ST_X(s.location::geometry)        AS exact_lng,
    ST_Y(s.location::geometry)        AS exact_lat,
    -- Contagem de capturas neste spot
    (SELECT COUNT(*) FROM public.captures c WHERE c.spot_id = s.id) AS total_captures,
    -- Setup mais recente deste spot
    (SELECT se.lure_type FROM public.setups se
     JOIN public.captures ca ON ca.id = se.capture_id
     WHERE ca.spot_id = s.id ORDER BY ca.captured_at DESC LIMIT 1) AS latest_lure_type,
    (SELECT se.lure_model FROM public.setups se
     JOIN public.captures ca ON ca.id = se.capture_id
     WHERE ca.spot_id = s.id ORDER BY ca.captured_at DESC LIMIT 1) AS latest_lure_model,
    (SELECT se.lure_color FROM public.setups se
     JOIN public.captures ca ON ca.id = se.capture_id
     WHERE ca.spot_id = s.id ORDER BY ca.captured_at DESC LIMIT 1) AS latest_lure_color,
    p.display_name AS owner_name,
    p.avatar_url   AS owner_avatar
FROM public.spots s
JOIN public.profiles p ON p.id = s.user_id
WHERE s.is_active = TRUE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_verifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles visíveis a todos" ON public.profiles
    FOR SELECT USING (TRUE);
CREATE POLICY "Usuário edita seu próprio perfil" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- SPOTS
CREATE POLICY "Spots públicos e comunitários visíveis a todos" ON public.spots
    FOR SELECT USING (
        privacy_level IN ('public', 'community')
        OR user_id = auth.uid()
    );
CREATE POLICY "Usuário gerencia seus spots" ON public.spots
    FOR ALL USING (auth.uid() = user_id);

-- CAPTURES
CREATE POLICY "Capturas públicas visíveis a todos" ON public.captures
    FOR SELECT USING (is_public = TRUE OR user_id = auth.uid());
CREATE POLICY "Usuário gerencia suas capturas" ON public.captures
    FOR ALL USING (auth.uid() = user_id);

-- SETUPS
CREATE POLICY "Setups visíveis junto a capturas públicas" ON public.setups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.captures c
            WHERE c.id = setups.capture_id AND (c.is_public = TRUE OR c.user_id = auth.uid())
        )
    );
CREATE POLICY "Usuário gerencia seus setups" ON public.setups
    FOR ALL USING (auth.uid() = user_id);

-- INTERACTIONS
CREATE POLICY "Interações públicas visíveis a todos" ON public.interactions
    FOR SELECT USING (TRUE);
CREATE POLICY "Usuário gerencia suas interações" ON public.interactions
    FOR ALL USING (auth.uid() = user_id);

-- SPOT VERIFICATIONS
CREATE POLICY "Verificações visíveis a todos" ON public.spot_verifications
    FOR SELECT USING (TRUE);
CREATE POLICY "Usuário gerencia suas verificações" ON public.spot_verifications
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: criar profile automaticamente ao registrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'pescador_' || SUBSTR(NEW.id::TEXT, 1, 6)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Pescador'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DADOS DE EXEMPLO (seeds para desenvolvimento)
-- ============================================================
-- Nota: em produção, remova estes inserts ou mova para seed.sql separado
