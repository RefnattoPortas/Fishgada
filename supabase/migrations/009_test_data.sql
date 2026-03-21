-- Script para gerar 30 SPOTS PUBLICOS, 10 PESQUEIROS e 100 CAPTURAS
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
    -- 1. Obter um usuário válido (tentando o mais comum ou o primeiro da lista)
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Nenhum usuário encontrado na tabela auth.users. Faça um login no app primeiro.';
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

    -- 2. Limpeza total de dados operacionais
    DELETE FROM public.setups;
    DELETE FROM public.captures;
    DELETE FROM public.spots;

    -- 3. Gerar 30 SPOTS PUBLICOS (Todos públicos para garantir visibilidade)
    FOR v_i IN 1..30 LOOP
        INSERT INTO public.spots (
            id, 
            user_id, 
            title, 
            description, 
            privacy_level, 
            water_type, 
            location,
            is_active
        )
        VALUES (
            gen_random_uuid(),
            v_user_id,
            'Ponto Público ' || v_i,
            'Local de teste para pesca de ' || v_species[floor(random() * 15 + 1)],
            'public',
            v_water_types[floor(random() * 4 + 1)],
            ST_SetSRID(ST_MakePoint(-35.0 - (random() * 35.0), -5.0 - (random() * 25.0)), 4326)::geography,
            true
        ) RETURNING id INTO v_spot_id;

        -- Gerar 3 capturas vinculadas por spot (Total 90)
        FOR v_j IN 1..3 LOOP
            INSERT INTO public.captures (
                user_id, 
                spot_id, 
                species, 
                weight_kg, 
                length_cm, 
                was_released, 
                is_trophy, 
                captured_at, 
                is_public
            ) VALUES (
                v_user_id,
                v_spot_id,
                v_species[floor(random() * 15 + 1)],
                round((random() * 40 + 0.5)::numeric, 2),
                round((random() * 120 + 10)::numeric, 1),
                (random() > 0.4),
                (random() > 0.8),
                now() - (random() * interval '90 days'),
                true
            );
        END LOOP;
    END LOOP;

    -- 4. Gerar 10 PESQUEIROS FICTÍCIOS (se a tabela existir)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fishing_resorts') THEN
        FOR v_i IN 1..10 LOOP
            -- Primeiro cria o Spot para o Pesqueiro
            INSERT INTO public.spots (
                id, user_id, title, description, privacy_level, water_type, location, is_active
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                'Pesqueiro do Renatinho ' || v_i,
                'Estrutura completa para sua pescaria.',
                'public',
                'lake',
                ST_SetSRID(ST_MakePoint(-46.6 - (v_i * 0.1), -23.5 - (v_i * 0.1)), 4326)::geography,
                true
            ) RETURNING id INTO v_spot_id;

            -- Depois cria o Resort vinculado ao Spot
            INSERT INTO public.fishing_resorts (
                spot_id,
                phone,
                website,
                is_partner,
                main_species,
                infrastructure
            ) VALUES (
                v_spot_id,
                '(11) 99999-000' || v_i,
                'www.pesqueiro' || v_i || '.com.br',
                true,
                ARRAY['Tambaqui', 'Pirarara', 'Tilápia'],
                '{"restaurante": true, "banheiros": true, "wi_fi": true, "pousada": false}'::jsonb
            );
        END LOOP;
    ELSE
        RAISE NOTICE 'Tabela fishing_resorts não encontrada. Ignorando criação de pesqueiros...';
    END IF;

    -- 5. Mais 10 capturas avulsas para completar 100
    FOR v_i IN 1..10 LOOP
        INSERT INTO public.captures (
            user_id, 
            species, 
            weight_kg, 
            length_cm, 
            captured_at, 
            photo_url,
            is_public
        ) VALUES (
            v_user_id,
            v_species[floor(random() * 15 + 1)],
            1.5,
            30.0,
            now(),
            'https://placehold.co/600x400?text=Captura+Extra+' || v_i,
            true
        );
    END LOOP;

    RAISE NOTICE 'Sucesso! 30 spots publicos, 10 pesqueiros e 100 capturas geradas.';
END $$;
