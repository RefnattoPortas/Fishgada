-- Criação da tabela de Catálogo de Espécies
CREATE TABLE IF NOT EXISTS public.species (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_comum TEXT NOT NULL,
    nome_cientifico TEXT NOT NULL,
    habitat TEXT NOT NULL,
    tamanho_recorde_cm NUMERIC,
    peso_recorde_kg NUMERIC,
    isca_favorita TEXT,
    dica_pro TEXT,
    tamanho_minimo_cm NUMERIC,
    imagem_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Popular o banco com 20 Espécies Icônicas da América do Sul
INSERT INTO public.species (nome_comum, nome_cientifico, habitat, tamanho_recorde_cm, peso_recorde_kg, isca_favorita, dica_pro, tamanho_minimo_cm, imagem_url) VALUES
('Tucunaré Açu', 'Cichla temensis', 'Bacia Amazônica', 120, 13, 'Iscas de superfície (Hélices, Poppers)', 'Bate muito bem em iscas de superfície com barulho contínuo e rápido. Exige equipamento pesado (Linha PE 50-65lbs).', 60, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Tucunaré Azul', 'Cichla piquiti', 'Bacia do Tocantins-Araguaia', 80, 6, 'Zaras e Meia-água', 'Mais arisco que o Açu. Trabalhe a isca com paradinhas mais longas.', 45, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Dourado', 'Salminus brasiliensis', 'Bacia do Prata, Paraguai, Paraná', 110, 25, 'Crankbaits, Colheres e Iscas naturais (Tuviaras)', 'Possui boca incrivelmente óssea. Fisgue com muita força e use iscas de cores berrantes (Laranja, Verde Limão).', 65, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Robalo Flecha', 'Centropomus undecimalis', 'Estuários, Mangues e Litoral', 140, 24, 'Camarão artificial (Soft plastic) e Plugs', 'Procure estruturas (galhadas, pontes) onde a água corre rápido. A maré vazante é o melhor momento.', 60, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Robalo Peva', 'Centropomus parallelus', 'Estuários, Mangues e Litoral', 60, 5, 'Jig Head com Soft, Camarão vivo', 'Mais sensível que o Flecha. Use jigs mais leves e fluorocarbono fino para não espantar o peixe.', 30, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Piraíba', 'Brachyplatystoma filamentosum', 'Bacia Amazônica, Araguaia', 280, 200, 'Iscas naturais brutas (Piranha inteira, Matrinxã)', 'É "o tubarão de água doce". Exige carretilhas de perfil redondo pesadas, anzol circular 10/0 a 12/0 e paciência.', 150, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Pirarara', 'Brachyplatystoma rousseauxii', 'Bacia Amazônica, Araguaia, Tocantins', 150, 60, 'Peixes inteiros, enguias', 'Sua corrida é violenta e imediata para as galhadas submersas. Freio muito apertado e líder resistente são essenciais.', 80, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Pirarucu', 'Arapaima gigas', 'Bacia Amazônica', 300, 200, 'Iscas naturais, Plugs pesados de fundo', 'Exige observação visual das cabeçadas na superfície. Respeite as regras restritas do Ibama/Manejo sobre o abate.', 150, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Traíra', 'Hoplias malabaricus', 'Brejos, Lagoas, Represas em todo Brasil', 60, 4, 'Frogs (Sapos de silicone), Zaras, Spinnerbaits', 'Fica em águas rasas, rasgações e capim. Trabalhe o sapo de borracha com pequenos toques em meio à vegetação.', 30, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Trairão', 'Hoplias lacerdae', 'Bacia Amazônica, Tapajós', 100, 10, 'Iscas de superfície com hélice, Plugs', 'Uma evolução gigantesca da Traíra. Extremamente agressivo. Empate de aço é obrigatório.', 40, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Cachara', 'Pseudoplatystoma fasciatum', 'Bacia do Prata, Pantanal, Araguaia', 120, 20, 'Iscas vivas (Tuvira, Lambari)', 'Peixe de fundo. Pesque próximo a barrancos ou pedreiras em águas profundas.', 80, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Pintado', 'Pseudoplatystoma corruscans', 'Bacia do rio São Francisco, Paraná', 160, 80, 'Tuviras, Minhocuçu', 'Prefere canal dos rios. Evite correntes muito fortes. Use equipamento pesado.', 85, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Pacu', 'Piaractus mesopotamicus', 'Bacia do Prata, Pantanal', 80, 25, 'Frutas (Coquinho, Goiaba), Massa', 'Bate sorrateiro. Arremesse embaixo das árvores nas margens durante frutificações.', 45, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Tambaqui', 'Colossoma macropomum', 'Bacia Amazônica e Pesqueiros', 100, 30, 'Massa, Ração, Salsicha', 'O "Rei dos Pesqueiros". As brigas são demoradas, use varas compridas para amortecer as corridas e cansar o peixe.', 60, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Corvina de Água Doce', 'Plagioscion squamosissimus', 'Bacias do Amazonas, represa', 60, 5, 'Jig head, Lambari vivo', 'Trabalhe devagar pelo fundo (cascalhos). É atraída pelas batidas do grub no fundo da água.', 30, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Apapá', 'Pellona castelnaeana', 'Pantanal, Araguaia', 70, 7, 'Pequenas iscas prateadas, jigs de pena', 'Saltador acrobático fantástico, possui cor dourada linda. Perca poucas puxando sempre com linha reta, boca muita frágil!', 40, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Matrinxã', 'Brycon amazonicus', 'Bacia Amazônica', 80, 8, 'Iscas de Meia Água, Spinner, Frutas', 'Agressivo, dentição terrível. Use empate pequeno de aço ou linha de flúor grossa no líder.', 35, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Bicuda', 'Pellona flavipinnis', 'Bacia do Araguaia-Tocantins, Amazônica', 100, 10, 'Iscas rápidas de meia-água e superfície', 'Peixe de corrida ultra-rápida. Ao sentir a batida recole a isca na máxima velocidade para não dar afrouxo.', 40, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Piapara', 'Leporinus elongatus', 'Bacia do Paraná, São Francisco', 60, 4, 'Milho verde e Massa em anzol chinu', 'Pesca na espera, em rodada lenta. A clássica pesca de batidinha na ponta da vara.', 40, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png'),
('Black Bass', 'Micropterus salmoides', 'Represas do Sul/Sudeste (Introduzido)', 65, 8, 'Minhocas Vacky (Soft Plastics), Spinner', 'Peixe de emboscada. Prefere raízes submersas e pauleiras. Trabalhe isca macia em pausas super lentas. Rei do Finesse.', 35, 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png');

-- Criar View para unificar captura das especies do usuario
CREATE OR REPLACE VIEW public.user_species_album AS
SELECT 
    s.id AS species_id,
    s.nome_comum,
    s.nome_cientifico,
    s.habitat,
    s.tamanho_recorde_cm,
    s.peso_recorde_kg,
    s.isca_favorita,
    s.dica_pro,
    s.tamanho_minimo_cm,
    s.imagem_url,
    c.user_id,
    COUNT(c.id) AS total_capturas,
    MAX(c.length_cm) AS maior_tamanho_capturado_cm,
    MAX(c.weight_kg) AS maior_peso_capturado_kg,
    MAX(c.captured_at) AS ultima_captura
FROM 
    public.species s
LEFT JOIN 
    public.captures c ON LOWER(TRIM(c.species)) = LOWER(TRIM(s.nome_comum))
GROUP BY 
    s.id, c.user_id;
