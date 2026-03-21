-- Script para limpar banco e gerar 30 SPOTS e 100 CAPTURAS
-- Execute este script no SQL Editor do Supabase

DO $$
DECLARE
    v_user_id UUID;
    v_spot_id UUID;
    v_species TEXT[];
    v_water_types TEXT[];
    v_i INTEGER;
    v_j INTEGER;
BEGIN
    -- Obter o primeiro usuário disponível
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Nenhum usuário encontrado. Entre no app pelo menos uma vez.';
        RETURN;
    END IF;

    -- Espécies variadas para o álbum
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
        'Piraíba (Brachyplatystoma filamentosum)',
        'Jaú (Zungaro jahu)',
        'Pirarara (Phractocephalus hemioliopterus)',
        'Tucunaré-Paca (Cichla piquiti)',
        'Matrinxã (Brycon amazonicus)',
        'Cachara (Pseudoplatystoma fasciatum)'
    ];
    
    v_water_types := ARRAY['river', 'lake', 'reservoir', 'sea'];

    -- 1. Limpeza total de dados operacionais
    DELETE FROM public.setups;
    DELETE FROM public.captures;
    DELETE FROM public.spots;

    -- 2. Gerar 30 Spots (Pontos de Pesca) espalhados pelo Brasil
    FOR v_i IN 1..30 LOOP
        INSERT INTO public.spots (
            id, 
            user_id, 
            title, 
            description, 
            lat, 
            lng, 
            privacy_level, 
            water_type, 
            location,
            is_active
        )
        VALUES (
            gen_random_uuid(),
            v_user_id,
            CASE 
                WHEN v_i % 3 = 0 THEN 'Pesqueiro ' || v_i
                WHEN v_i % 3 = 1 THEN 'Rio ' || v_i
                ELSE 'Lagoa ' || v_i
            END,
            'Ponto de teste número ' || v_i || '. Excelente para ' || v_species[floor(random() * 15 + 1)],
            -5.0 - (random() * 25.0), -- Latitude entre -5 e -30 (Brasil)
            -35.0 - (random() * 35.0), -- Longitude entre -35 e -70 (Brasil)
            (ARRAY['public', 'community', 'private'])[floor(random() * 3 + 1)],
            v_water_types[floor(random() * 4 + 1)],
            ST_SetSRID(ST_MakePoint(-35.0 - (random() * 35.0), -5.0 - (random() * 25.0)), 4326),
            true
        ) RETURNING id INTO v_spot_id;

        -- 3. Gerar 2 a 3 Capturas vinculadas a este Spot (Total ~75)
        FOR v_j IN 1..(floor(random() * 2 + 2)) LOOP
            INSERT INTO public.captures (
                user_id, 
                spot_id, 
                species, 
                weight_kg, 
                length_cm, 
                was_released, 
                is_trophy, 
                captured_at, 
                notes,
                is_public
            ) VALUES (
                v_user_id,
                v_spot_id,
                v_species[floor(random() * 15 + 1)],
                round((random() * 40 + 0.5)::numeric, 2),
                round((random() * 120 + 10)::numeric, 1),
                (random() > 0.4),
                (random() > 0.85),
                now() - (random() * interval '90 days'),
                'Captura de teste vinculada ao spot ' || v_i,
                true
            );
        END LOOP;
    END LOOP;

    -- 4. Gerar capturas avulsas para completar 100 (aprox +25)
    FOR v_i IN 1..25 LOOP
        INSERT INTO public.captures (
            user_id, 
            species, 
            weight_kg, 
            length_cm, 
            captured_at, 
            photo_url,
            is_public,
            notes
        ) VALUES (
            v_user_id,
            v_species[floor(random() * 15 + 1)],
            round((random() * 12 + 0.1)::numeric, 2),
            round((random() * 45 + 5)::numeric, 1),
            now() - (random() * interval '20 days'),
            'https://placehold.co/600x400?text=Captura+Avulsa+' || v_i,
            true,
            'Captura fictícia sem spot vinculado.'
        );
    END LOOP;

    RAISE NOTICE 'Limpeza concluída! 30 spots e 100 capturas geradas com sucesso.';
END $$;
