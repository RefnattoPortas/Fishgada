-- Adicionar colunas de localização e engajamento ao perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Função para atualizar o contador de likes no perfil do autor da captura
CREATE OR REPLACE FUNCTION public.handle_capture_like_change()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
BEGIN
    -- Obter o ID do autor da captura que recebeu/perdeu o like
    IF (TG_OP = 'INSERT' AND NEW.type = 'like') THEN
        SELECT user_id INTO v_author_id FROM public.captures WHERE id = NEW.capture_id;
        UPDATE public.profiles SET total_likes = total_likes + 1 WHERE id = v_author_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.type = 'like') THEN
        IF (OLD.type = 'like') THEN
            SELECT user_id INTO v_author_id FROM public.captures WHERE id = OLD.capture_id;
            UPDATE public.profiles SET total_likes = total_likes - 1 WHERE id = v_author_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar total_likes
DROP TRIGGER IF EXISTS on_like_change ON public.interactions;
CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.handle_capture_like_change();

-- Tabela de Seguidores (Social)
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- Sincronizar dados existentes
-- NOTA: Como a tabela captures pode ser grande, fazemos um update em lote se necessário
UPDATE public.profiles p
SET total_likes = (
    SELECT COUNT(*) 
    FROM public.interactions i
    JOIN public.captures c ON i.capture_id = c.id
    WHERE c.user_id = p.id AND i.type = 'like'
);
