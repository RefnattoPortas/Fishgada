-- ============================================================
-- WikiFish Optimization & Events v1.4
-- ============================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias notificações" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza suas próprias notificações" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);


-- 2. TRANSFORMAR spots_map_view EM MATERIALIZED VIEW
DROP VIEW IF EXISTS public.spots_map_view;

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
    -- Contagem de torneios abertos
    (SELECT COUNT(*) FROM public.tournaments t WHERE t.resort_id = fr.id AND t.status = 'open') AS open_tournaments_count
FROM public.spots s
JOIN public.profiles p ON p.id = s.user_id
LEFT JOIN public.fishing_resorts fr ON fr.spot_id = s.id
WHERE s.is_active = TRUE;

-- Criar índice único obrigatório para atualização CONCURRENTLY
CREATE UNIQUE INDEX spots_map_view_id_idx ON public.spots_map_view (id);

-- 3. FUNÇÃO E TRIGGERS PARA REFRESH DA MATERIALIZED VIEW
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


-- 4. TRIGGER PARA NOTIFICAR TORNEIOS PROXIMOS (50km)
CREATE OR REPLACE FUNCTION public.notify_nearby_tournament()
RETURNS TRIGGER AS $$
DECLARE
    resort_spot RECORD;
    target_user RECORD;
BEGIN
    -- Obter a localização do pesqueiro do torneio
    SELECT s.id, s.location, s.title INTO resort_spot
    FROM public.fishing_resorts fr
    JOIN public.spots s ON s.id = fr.spot_id
    WHERE fr.id = NEW.resort_id;

    -- Buscar usuários que registraram captura num raio de 50km
    -- Usando DISTINCT para não notificar a mesma pessoa 2x
    FOR target_user IN (
        SELECT DISTINCT c.user_id 
        FROM public.captures c
        JOIN public.spots s ON s.id = c.spot_id
        WHERE ST_DWithin(s.location::geography, resort_spot.location::geography, 50000)
    ) LOOP
        INSERT INTO public.notifications (user_id, title, message, link)
        VALUES (
            target_user.user_id,
            'Novo Torneio Próximo a Você! 🏆',
            'O pesqueiro ' || resort_spot.title || ' acabou de publicar o torneio: ' || NEW.title || '. Garanta sua vaga!',
            '/tournaments'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_tournament_notify
AFTER INSERT ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.notify_nearby_tournament();
