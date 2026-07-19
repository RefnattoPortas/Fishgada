-- ============================================================
-- Migration 021: Security consolidation
-- ============================================================
-- 1. Remove exact_lat/exact_lng da spots_map_view (exposição indevida)
-- 2. Consolida políticas conflitantes do fishing_resorts
-- 3. Adiciona RPC para obtenção segura de coordenadas exatas

-- ============================================================
-- PARTE 1: spots_map_view — remover coordenadas exatas
-- ============================================================
-- A view materializada expunha exact_lat/exact_lng para TODOS os spots,
-- independente do privacy_level. Isso permitia que qualquer usuário
-- lesse a localização exata de spots privados/comunitários.
--
-- A view agora retorna apenas coordenadas display (fuzzeadas).
-- Coordenadas exatas podem ser obtidas via RPC (parte 3).

DROP MATERIALIZED VIEW IF EXISTS public.spots_map_view CASCADE;

CREATE MATERIALIZED VIEW public.spots_map_view AS
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
    ST_X(COALESCE(s.location_fuzzed, s.location)::geometry) AS display_lng,
    ST_Y(COALESCE(s.location_fuzzed, s.location)::geometry) AS display_lat,
    (SELECT COUNT(*) FROM public.captures c WHERE c.spot_id = s.id) AS total_captures,
    (SELECT se.lure_type FROM public.setups se
     JOIN public.captures ca ON ca.id = se.capture_id
     WHERE ca.spot_id = s.id ORDER BY ca.captured_at DESC LIMIT 1) AS latest_lure_type,
    p.display_name AS owner_name,
    p.avatar_url   AS owner_avatar,
    COALESCE(fr.photos->>0, s.photo_url) AS photo_url,
    fr.id              AS resort_id,
    fr.id IS NOT NULL  AS is_resort,
    fr.is_partner      AS is_resort_partner,
    fr.infrastructure  AS resort_infrastructure,
    fr.prices          AS resort_prices,
    fr.active_highlight AS resort_active_highlight,
    fr.notice_board    AS resort_notice_board,
    fr.is_active       AS resort_is_active,
    fr.photos          AS resort_photos,
    fr.opening_hours,
    fr.phone,
    fr.instagram,
    fr.website,
    fr.main_species    AS resort_main_species,
    (SELECT COUNT(*) FROM public.tournaments t WHERE t.resort_id = fr.id AND t.status = 'open') AS open_tournaments_count
FROM public.spots s
JOIN public.profiles p ON p.id = s.user_id
LEFT JOIN public.fishing_resorts fr ON fr.spot_id = s.id
WHERE
    s.is_active = TRUE
    AND (
        fr.id IS NULL
        OR fr.is_active = TRUE
    );

CREATE UNIQUE INDEX spots_map_view_id_idx ON public.spots_map_view (id);

-- Recriar triggers
CREATE OR REPLACE FUNCTION public.refresh_spots_map_view()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.spots_map_view;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_spots_map_view_spots
AFTER INSERT OR UPDATE OR DELETE ON public.spots
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_spots_map_view();

CREATE TRIGGER refresh_spots_map_view_captures
AFTER INSERT OR UPDATE OR DELETE ON public.captures
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_spots_map_view();

CREATE TRIGGER refresh_spots_map_view_fishing_resorts
AFTER INSERT OR UPDATE OR DELETE ON public.fishing_resorts
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_spots_map_view();

CREATE TRIGGER refresh_spots_map_view_tournaments
AFTER INSERT OR UPDATE OR DELETE ON public.tournaments
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_spots_map_view();

-- ============================================================
-- PARTE 2: Consolidar políticas do fishing_resorts
-- ============================================================
-- Conflito anterior:
--   migração 003: SELECT TRUE (todos veem todos)
--   migração 010: SELECT is_active = TRUE OR owner (seletivo)
-- Resultado: ambas combinadas via OR, então a 003 anulava a 010
--
-- Solução: DROP de todas as políticas antigas e recriação coerente.

DROP POLICY IF EXISTS "Pesqueiros visíveis a todos" ON public.fishing_resorts;
DROP POLICY IF EXISTS "Apenas admin ou dono do spot gerencia o resort" ON public.fishing_resorts;
DROP POLICY IF EXISTS "Users can create their own resorts" ON public.fishing_resorts;
DROP POLICY IF EXISTS "Owners can update their own resorts" ON public.fishing_resorts;
DROP POLICY IF EXISTS "Public can see active resorts" ON public.fishing_resorts;

-- SELECT: apenas resorts ativos ou do próprio usuário
CREATE POLICY "Resorts visíveis apenas se ativos ou próprio"
ON public.fishing_resorts FOR SELECT
TO public
USING (is_active = TRUE OR auth.uid() = owner_id);

-- INSERT: apenas o próprio usuário, com owner_id igual ao auth.uid()
CREATE POLICY "Usuário cria apenas seus próprios resorts"
ON public.fishing_resorts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- UPDATE: apenas o dono (via owner_id) ou admin
CREATE POLICY "Dono ou admin atualiza resort"
ON public.fishing_resorts FOR UPDATE
TO authenticated
USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
)
WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- DELETE: apenas o dono ou admin
CREATE POLICY "Dono ou admin exclui resort"
ON public.fishing_resorts FOR DELETE
TO authenticated
USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- ============================================================
-- PARTE 3: RPC para coordenadas exatas (apenas para donos/admins)
-- ============================================================
-- Substitui a coluna exact_lat/exact_lng que foi removida da view.
-- O cliente chama esta função apenas quando precisa das coordenadas
-- exatas (ex: editar spot).

CREATE OR REPLACE FUNCTION public.get_spot_exact_coordinates(spot_id UUID)
RETURNS TABLE (exact_lat DOUBLE PRECISION, exact_lng DOUBLE PRECISION)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verifica se o usuário é dono do spot ou admin
    IF EXISTS (
        SELECT 1 FROM public.spots s
        WHERE s.id = spot_id
        AND (
            s.user_id = auth.uid()
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        )
    ) THEN
        RETURN QUERY
        SELECT
            ST_Y(s.location::geometry) AS exact_lat,
            ST_X(s.location::geometry) AS exact_lng
        FROM public.spots s
        WHERE s.id = spot_id;
    ELSE
        -- Retorna coordenadas fuzzeadas para não dar pistas
        RETURN QUERY
        SELECT
            ST_Y(COALESCE(s.location_fuzzed, s.location)::geometry) AS exact_lat,
            ST_X(COALESCE(s.location_fuzzed, s.location)::geometry) AS exact_lng
        FROM public.spots s
        WHERE s.id = spot_id;
    END IF;
END;
$$;

-- ============================================================
-- PARTE 4: Função similar para resorts (ownership check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_resort_exact_coordinates(resort_id UUID)
RETURNS TABLE (exact_lat DOUBLE PRECISION, exact_lng DOUBLE PRECISION)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.fishing_resorts fr
        JOIN public.spots s ON s.id = fr.spot_id
        WHERE fr.id = resort_id
        AND (
            s.user_id = auth.uid()
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
        )
    ) THEN
        RETURN QUERY
        SELECT
            ST_Y(s.location::geometry) AS exact_lat,
            ST_X(s.location::geometry) AS exact_lng
        FROM public.fishing_resorts fr
        JOIN public.spots s ON s.id = fr.spot_id
        WHERE fr.id = resort_id;
    ELSE
        RETURN QUERY
        SELECT
            ST_Y(COALESCE(s.location_fuzzed, s.location)::geometry) AS exact_lat,
            ST_X(COALESCE(s.location_fuzzed, s.location)::geometry) AS exact_lng
        FROM public.fishing_resorts fr
        JOIN public.spots s ON s.id = fr.spot_id
        WHERE fr.id = resort_id;
    END IF;
END;
$$;
