-- 012: Fix de filtragem por espécie no mapa
-- Adiciona a coluna searchable_species na view para permitir que o filtro por peixe funcione mesmo se o peixe não estiver no título.

DROP VIEW IF EXISTS public.spots_map_view;
DROP MATERIALIZED VIEW IF EXISTS public.spots_map_view;

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
    COALESCE(fr.photos->>0, s.photo_url) AS photo_url,
    fr.id              AS resort_id,
    fr.id IS NOT NULL AS is_resort,
    fr.is_partner     AS is_resort_partner,
    fr.infrastructure AS resort_infrastructure,
    fr.prices         AS resort_prices,
    fr.active_highlight AS resort_active_highlight,
    fr.is_active      AS resort_is_active,
    fr.photos         AS resort_photos,
    fr.notice_board    AS resort_notice_board,
    fr.opening_hours,
    fr.phone,
    fr.instagram,
    fr.website,
    fr.main_species    AS resort_main_species,
    (SELECT COUNT(*) FROM public.tournaments t WHERE t.resort_id = fr.id AND t.status = 'open') AS open_tournaments_count,
    -- Agrega as espécies capturadas + as espécies principais do pesqueiro em uma única string de busca
    COALESCE((
        SELECT string_agg(DISTINCT LOWER(species), ', ') 
        FROM public.captures 
        WHERE spot_id = s.id
    ), '') || ' ' || COALESCE(LOWER(array_to_string(fr.main_species, ', ')), '') AS searchable_species
FROM public.spots s
JOIN public.profiles p ON p.id = s.user_id
LEFT JOIN public.fishing_resorts fr ON fr.spot_id = s.id
WHERE 
    s.is_active = TRUE
    AND (
        fr.id IS NULL 
        OR fr.is_active = TRUE
    );
