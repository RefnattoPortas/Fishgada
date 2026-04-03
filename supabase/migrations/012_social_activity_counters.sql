-- 1. Ativar RLS na tabela follows (estava pública sem políticas)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
-- Política: Qualquer um pode ver quem segue quem
CREATE POLICY "Seguidores visíveis a todos" ON public.follows FOR
SELECT USING (TRUE);
-- Política: Usuários podem seguir outros (inserir)
CREATE POLICY "Usuários podem seguir outros" ON public.follows FOR
INSERT WITH CHECK (auth.uid() = follower_id);
-- Política: Usuários podem parar de seguir (deletar)
CREATE POLICY "Usuários podem parar de seguir" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
-- 2. Adicionar contadores de interações na tabela captures para performance no feed
ALTER TABLE public.captures
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
-- 3. Função para atualizar contadores na captura
CREATE OR REPLACE FUNCTION public.handle_capture_interaction_change() RETURNS TRIGGER AS $$ BEGIN IF (TG_OP = 'INSERT') THEN IF (NEW.type = 'like') THEN
UPDATE public.captures
SET likes_count = likes_count + 1
WHERE id = NEW.capture_id;
ELSIF (NEW.type = 'comment') THEN
UPDATE public.captures
SET comments_count = comments_count + 1
WHERE id = NEW.capture_id;
END IF;
ELSIF (TG_OP = 'DELETE') THEN IF (OLD.type = 'like') THEN
UPDATE public.captures
SET likes_count = likes_count - 1
WHERE id = OLD.capture_id;
ELSIF (OLD.type = 'comment') THEN
UPDATE public.captures
SET comments_count = comments_count - 1
WHERE id = OLD.capture_id;
END IF;
END IF;
RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 4. Trigger para atualizar contadores em tempo real
DROP TRIGGER IF EXISTS on_interaction_change_counters ON public.interactions;
CREATE TRIGGER on_interaction_change_counters
AFTER
INSERT
    OR DELETE ON public.interactions FOR EACH ROW EXECUTE FUNCTION public.handle_capture_interaction_change();
-- 5. Sincronizar contadores existentes
UPDATE public.captures c
SET likes_count = (
        SELECT COUNT(*)
        FROM public.interactions i
        WHERE i.capture_id = c.id
            AND i.type = 'like'
    ),
    comments_count = (
        SELECT COUNT(*)
        FROM public.interactions i
        WHERE i.capture_id = c.id
            AND i.type = 'comment'
    );