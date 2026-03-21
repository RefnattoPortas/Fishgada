-- Script Master para gerar 30 SPOTS PUBLICOS, 15 PESQUEIROS PARCEIROS e 135 CAPTURAS COM FOTO E LIKES
-- Execute este script no SQL Editor do Supabase

DO $$
DECLARE
    v_user_id UUID;
    v_spot_id UUID;
    v_capture_id UUID;
    v_species TEXT[];
    v_water_types TEXT[];
    v_i INTEGER;
    v_j INTEGER;
    v_k INTEGER;
    v_total_captures INTEGER := 0;
BEGIN
    -- 1. Obter um usuário válido (ordem de criação)
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Nenhum usuário encontrado. Faça login primeiro.';
        RETURN;
    END IF;

    -- Espécies oficiais
    v_species := ARRAY[
        'Tambaqui (Colossoma macropomum)', 
        'Pirarucu (Arapaima gigas)', 
        'Dourado (Salminus brasiliensis)', 
        'Tucunaré-Açu (Cichla temensis)', 
        'Pintado/Surubim (Pseudoplatystoma corruscans)',
        'Traíra (Hoplias malabaricus)',
        'Robalo-Flecha (Centropomus undecimalis)',
        'Tilápia-do-Nilo (Oreochromis niloticus)',
        'Pacu (Piaractus mesopotamicus)',
        'Piraíba (Brachyplatystoma filamentosum)'
    ];
    
    v_water_types := ARRAY['river', 'lake', 'reservoir', 'sea'];

    -- 2. Limpeza profunda
    DELETE FROM public.interactions;
    DELETE FROM public.setups;
    DELETE FROM public.fishing_resorts;
    DELETE FROM public.captures;
    DELETE FROM public.spots;

    RAISE NOTICE 'Limpando banco... Iniciando criação massiva (135 capturas + 45 locais)...';

    -- 3. Gerar 30 SPOTS PUBLICOS (Pela costa e interior do Brasil)
    FOR v_i IN 1..30 LOOP
        INSERT INTO public.spots (
            id, user_id, title, description, privacy_level, water_type, location, is_active, fuzz_radius_m
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            'Ponto de Pesca ' || v_i,
            'Local para pesca esportiva com excelentes resultados.',
            'public',
            v_water_types[floor(random() * 4 + 1)],
            ST_SetSRID(ST_MakePoint(-35 - (random() * 35), -5 - (random() * 25)), 4326)::geography,
            true,
            0 -- Sem raio de imprecisão para teste
        ) RETURNING id INTO v_spot_id;

        -- 3 capturas por spot = 90
        FOR v_j IN 1..3 LOOP
            v_total_captures := v_total_captures + 1;
            INSERT INTO public.captures (
                id, user_id, spot_id, species, weight_kg, length_cm, captured_at, photo_url, is_public, is_trophy
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_spot_id,
                v_species[floor(random() * 10 + 1)],
                random() * 30 + 1,
                random() * 100 + 20,
                now() - (random() * interval '60 days'),
                'https://placehold.co/600x400?text=Captura+' || v_total_captures,
                true,
                (random() > 0.8)
            ) RETURNING id INTO v_capture_id;

            -- Inserir alguns LIKES
            FOR v_k IN 1..(floor(random() * 5 + 1)) LOOP
                -- Como não temos muitos usuários, usamos o mesmo ou UUIDs ficticios de profiles (se existirem)
                -- Vamos tentar inserir apenas se o profile existir. Como limpamos profiles? Não limpamos.
                -- Vou apenas inserir 1 like do próprio usuário para teste
                INSERT INTO public.interactions (user_id, capture_id, type)
                VALUES (v_user_id, v_capture_id, 'like')
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    -- 4. Gerar 15 PESQUEIROS PARCEIROS (Vinculados a novos Spots)
    FOR v_i IN 1..15 LOOP
        INSERT INTO public.spots (
            id, user_id, title, description, privacy_level, water_type, location, is_active, fuzz_radius_m
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            'Pesqueiro Parceiro ' || v_i,
            'Um dos melhores pesqueiros parceiros do FishMap.',
            'public',
            'lake',
            ST_SetSRID(ST_MakePoint(-47 + (random() * 4), -23 + (random() * 4)), 4326)::geography,
            true,
            0
        ) RETURNING id INTO v_spot_id;

        INSERT INTO public.fishing_resorts (
            spot_id, phone, website, is_partner, main_species, infrastructure
        ) VALUES (
            v_spot_id,
            '(11) 98888-777' || v_i,
            'www.parceiro' || v_i || '.com',
            true,
            ARRAY['Tambacu', 'Pirarara'],
            '{"restaurante": true, "banheiros": true, "wi_fi": true, "pousada": true}'::jsonb
        );

        -- Capturas no pesqueiro (3 por resort = 45)
        FOR v_j IN 1..3 LOOP
            v_total_captures := v_total_captures + 1;
            INSERT INTO public.captures (
                user_id, spot_id, species, weight_kg, length_cm, captured_at, photo_url, is_public
            ) VALUES (
                v_user_id,
                v_spot_id,
                v_species[floor(random() * 10 + 1)],
                random() * 15 + 2,
                random() * 80 + 30,
                now(),
                'https://placehold.co/600x400?text=Resort+' || v_i || '+Peixe+' || v_j,
                true
            );
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Dados gerados: 30 spots genéricos + 15 pesqueiros + 135 capturas com foto e curtidas.';
END $$;
