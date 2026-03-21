-- Refinamento do Fluxo de Negócios para Pesqueiros (v1.3)
-- 1. ADICIONAR COLUNAS NECESSÁRIAS na tabela fishing_resorts
ALTER TABLE public.fishing_resorts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
ALTER TABLE public.fishing_resorts ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE public.fishing_resorts ADD COLUMN IF NOT EXISTS active_highlight TEXT;
ALTER TABLE public.fishing_resorts ADD COLUMN IF NOT EXISTS notice_board TEXT;

-- 2. ATUALIZAR VIEW DE MAPA (spots_map_view)
-- A lógica: 
-- - Se o spot NÃO for um pesqueiro (fr.id IS NULL), ele aparece (wild spot).
-- - Se o spot FOR um pesqueiro (fr.id IS NOT NULL), ele SÓ aparece se fr.is_active for TRUE.

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
    fr.id IS NOT NULL AS is_resort,
    fr.is_partner     AS is_resort_partner,
    fr.infrastructure AS resort_infrastructure,
    fr.active_highlight AS resort_active_highlight,
    fr.is_active      AS resort_is_active -- Mantemos a coluna caso o front precise saber
FROM public.spots s
JOIN public.profiles p ON p.id = s.user_id
LEFT JOIN public.fishing_resorts fr ON fr.spot_id = s.id
WHERE 
    s.is_active = TRUE -- O spot em si deve estar ativo
    AND (
        fr.id IS NULL -- Aparece se não for pesqueiro
        OR fr.is_active = TRUE -- SÓ aparece se for pesqueiro ATIVO
    );
