-- Criação da tabela de Catálogo de Espécies
CREATE TABLE IF NOT EXISTS public.species (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_comum TEXT NOT NULL,
    nome_cientifico TEXT,
    habitat TEXT,
    tamanho_recorde_cm NUMERIC,
    peso_recorde_kg NUMERIC,
    isca_favorita TEXT,
    dica_pro TEXT,
    tamanho_minimo_cm NUMERIC,
    imagem_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Limpar para reinserir com a lista completa
DELETE FROM public.species;

-- Popular o banco com a lista massiva solicitada pelo usuário
INSERT INTO public.species (nome_comum, nome_cientifico, habitat, tamanho_recorde_cm, peso_recorde_kg, isca_favorita, dica_pro, tamanho_minimo_cm) VALUES
('Tambaqui', 'Colossoma macropomum', 'Bacia Amazônica', 100, 30, 'Massa, Ração, Salsicha', 'O "Rei dos Pesqueiros". As brigas são demoradas, use varas compridas para amortecer as corridas.', 60),
('Pirarucu', 'Arapaima gigas', 'Bacia Amazônica', 300, 200, 'Iscas naturais, Plugs pesados de fundo', 'Exige observação visual das cabeçadas na superfície. Respeite as regras restritas do Ibama/Manejo sobre o abate.', 150),
('Pacu', 'Piaractus mesopotamicus', 'Bacia do Prata, Pantanal', 80, 25, 'Frutas (Coquinho, Goiaba), Massa', 'Bate sorrateiro. Arremesse embaixo das árvores nas margens durante frutificações.', 45),
('Pintado/Surubim', 'Pseudoplatystoma corruscans', 'Bacia do rio São Francisco, Paraná', 160, 80, 'Tuviras, Minhocuçu', 'Prefere canal dos rios. Evite correntes muito fortes. Use equipamento pesado.', 85),
('Dourado', 'Salminus brasiliensis', 'Bacia do Prata, Paraguai, Paraná', 110, 25, 'Crankbaits, Colheres e Iscas naturais (Tuviaras)', 'Possui boca incrivelmente óssea. Fisgue com muita força e use iscas de cores berrantes.', 65),
('Piraíba', 'Brachyplatystoma filamentosum', 'Bacia Amazônica, Araguaia', 280, 200, 'Iscas naturais brutas (Piranha inteira, Matrinxã)', 'É "o tubarão de água doce". Exige carretilhas de perfil redondo pesadas.', 150),
('Jaú', 'Zungaro jahu', 'Bacias do Amazonas e do Paraná', 160, 120, 'Iscas naturais de fundo', 'Habita poços profundos e pedrais. Força bruta é necessária para tirá-lo do fundo.', 90),
('Pirarara', 'Phractocephalus hemioliopterus', 'Bacia Amazônica, Araguaia, Tocantins', 150, 60, 'Peixes inteiros, enguias', 'Sua corrida é violenta para as galhadas. Freio muito apertado e líder resistente são essenciais.', 80),
('Tucunaré-Açu', 'Cichla temensis', 'Bacia Amazônica', 120, 13, 'Iscas de superfície (Hélices, Poppers)', 'O maior dos Tucunarés. Exige equipamento pesado e muita energia nos arremessos.', 60),
('Tucunaré-Amarelo', 'Cichla ocellaris', 'Bacia Amazônica e Represas', 60, 4, 'Zaras, Meia-água e Jigs', 'Muito comum em represas do sudeste. Extremamente esportivo em equipamentos leves.', 35),
('Tucunaré-Paca', 'Cichla piquiti', 'Bacia Amazônica', 70, 5, 'Zaras e Meia-água', 'O paca é a fase jovem e ultra agressiva do Açu, ou subespécies específicas. Bate forte!', 40),
('Curimatã/Curimbatá', 'Prochilodus lineatus', 'Bacia do Prata e São Francisco', 60, 5, 'Massa, Chuveirinho', 'Pesca técnica de espera. Possui boca frágil para anzóis convencionais.', 38),
('Piauuçu', 'Leporinus macrocephalus', 'Bacia do Prata', 65, 6, 'Milho, Caranguejo, Massa', 'Lutador incansável. Ao sentir a fisgada, prepare-se para corridas rápidas.', 40),
('Matrinxã', 'Brycon amazonicus', 'Bacia Amazônica', 80, 8, 'Iscas de Meia Água, Spinner, Frutas', 'Agressivo, dentição terrível. Use empate pequeno de aço ou linha de flúor grossa.', 35),
('Cachara', 'Pseudoplatystoma fasciatum', 'Bacia do Prata, Pantanal, Araguaia', 120, 20, 'Iscas vivas (Tuvira, Lambari)', 'Peixe de fundo. Pesque próximo a barrancos ou pedreiras em águas profundas.', 80),
('Traíra', 'Hoplias malabaricus', 'Lagoas e Represas em todo Brasil', 60, 4, 'Frogs (Sapos de silicone), Zaras', 'Fica em águas rasas. Trabalhe o sapo de borracha com pequenos toques na vegetação.', 30),
('Trairão', 'Hoplias aimara', 'Bacia Amazônica, Tapajós', 100, 15, 'Superfície com hélice, Plugs', 'Uma evolução gigantesca da Traíra. Extremamente agressivo.', 40),
('Robalo-Flecha', 'Centropomus undecimalis', 'Estuários, Mangues e Litoral', 140, 24, 'Camarão artificial e Plugs', 'Procure estruturas onde a água corre rápido. A maré vazante é o melhor momento.', 60),
('Robalo-Peva', 'Centropomus parallelus', 'Estuários, Mangues e Litoral', 60, 5, 'Jig Head com Soft, Camarão vivo', 'Mais sensível que o Flecha. Use jigs mais leves e fluorocarbono fino.', 30),
('Mero', 'Epinephelus itajara', 'Recifes e Manguezais', 250, 400, 'Iscas naturais', 'Espécie criticamente ameaçada e com captura proibida por lei no Brasil.', 0);

-- Inserir os demais nomes comuns apenas (simplificado para os 100+)
INSERT INTO public.species (nome_comum) VALUES
('Bagre Africano'), ('Piranha-Vermelha'), ('Piranha-Preta'), ('Aruanã'), ('Apaiari'), ('Carpa-Comum'), ('Tilápia-do-Nilo'),
('Tambatinga'), ('Jundiá'), ('Bagre-do-Congo'), ('Tucunaré-Pinima'), ('Piau-Três-Pintas'), ('Cachorra-Larga'), ('Cachorra-Facão'),
('Bicuda'), ('Pacu-Peva'), ('Pacu-Caranha'), ('Caranha'), ('Piau-de-Vara'), ('Mandi-Pinda'), ('Surubim-do-Paraíba'),
('Bagre-do-Paraná'), ('Piranha-Caju'), ('Pacu-Branco'), ('Aracu'), ('Palometa'), ('Pacu-Manteiga'), ('Tambaqui-do-Tapajós'),
('Anchoveta-Peruana'), ('Sardinha-Verdadeira'), ('Pescada-Amarela'), ('Pescada-Branca'), ('Corvina'), ('Pescada-do-Reino'),
('Tainha'), ('Caçôes'), ('Cação-Anjo'), ('Tubarão-Azul'), ('Garoupa-Verdadeira'), ('Cherne-Poveiro'), ('Salmão-do-Atlântico'),
('Truta-Arco-Íris'), ('Atum-Albacora'), ('Atum-Azul'), ('Bonito-Listrado'), ('Cavala-Branca'), ('Cavala-Aipim'), ('Espadarte'),
('Marlin-Azul'), ('Marlin-Branco'), ('Peixe-Voador'), ('Dourado-do-Mar'), ('Pargo'), ('Pargo-Rosa'), ('Badejo-Manga'),
('Badejo-Quadrado'), ('Sernambiguara'), ('Xaréu-Branco'), ('Xaréu-Preto'), ('Pampo-Amarelo'), ('Pampo-Verdadeiro'),
('Olho-de-Boi'), ('Peixe-Espada'), ('Linguado'), ('Cação-Bico-Doce'), ('Raia-Viola'), ('Peixe-Serra'), ('Viola-de-Focinho'),
('Peixe-Cachimbo'), ('Corvina-Piava'), ('Pescada-Foguete'), ('Pescada-de-Canal'), ('Pescada-Gole'), ('Pescada-Maria-Mole'),
('Pescada-Panela'), ('Cação-Martelo'), ('Caçôes-Lixa'), ('Tainha-de-Sopapo'), ('Parati'), ('Corvina-de-Pedra'), ('Roncador'),
('Salema'), ('Peixe-Porco'), ('Peixe-Galo'), ('Peixe-Rei'), ('Bagre-Marinho'), ('Bagre-amarelo'), ('Bagre-bandeira'),
('Badejo-ferro'), ('Budião'), ('Cação-focinho-de-cobra'), ('Cação-mangona'), ('Carapeba'), ('Carapau'), ('Cavalinha'),
('Enchova'), ('Garoupa-pintada'), ('Guaiuba'), ('Ilarga'), ('Jaguariça'), ('Manjuba'), ('Maria-mole'), ('Moréia'),
('Olho-de-vidro'), ('Pargo-vermelho'), ('Peixe-cachorro'), ('Peixe-manteiga'), ('Peixe-rei-do-mar'), ('Peixe-sapo'),
('Prejereba'), ('Raia-prego'), ('Raia-ticonha'), ('Roncador-azul'), ('Sarda'), ('Sardinha-laje'), ('Serrajão'), ('Tainhoto'),
('Tambuatá'), ('Tubarão-mako'), ('Tubarão-raposa'), ('Ubarana'), ('Urupiara'), ('Xaréu-amarelo'), ('Xaréu-olho-preto');

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
