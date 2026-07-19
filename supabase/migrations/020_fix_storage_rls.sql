-- ============================================================
-- Migration 020: Fix Storage RLS — ownership enforcement
-- ============================================================
-- A migration 017 deixou o bucket 'photos' com política excessivamente
-- permissiva: QUALQUER usuário autenticado pode fazer upload, update
-- e delete de QUALQUER arquivo, independente de propriedade.
--
-- Esta migração restaura a verificação de ownership sem quebrar
-- os uploads existentes que usam paths como:
--   spots/{spotId}/...
--   resorts/{resortId}/...
--   captures/{captureId}/...

-- 1. Remover política excessivamente permissiva
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode fazer upload e update" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias fotos" ON storage.objects;

-- 2. SELECT: Público (qualquer um pode ver fotos)
CREATE POLICY "Fotos de spots são públicas — leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- 3. INSERT: Usuários autenticados podem fazer upload
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- 4. UPDATE/DELETE: Apenas o proprietário pode modificar ou excluir
-- A verificação é feita através do path do arquivo:
--   spots/{spotId}/...  →  spots.user_id = auth.uid()
--   resorts/{resortId}/...  →  fishing_resorts → spots.user_id = auth.uid()
--   captures/{captureId}/...  →  captures.user_id = auth.uid()
--   profiles/{userId}/...  →  profiles.id = auth.uid()
-- Administradores (is_admin = true) podem gerenciar qualquer arquivo.
CREATE POLICY "Apenas o dono ou admin pode modificar ou excluir"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'photos'
  AND (
    (storage.foldername(name))[1] = 'spots'
    AND EXISTS (
      SELECT 1 FROM spots
      WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'resorts'
    AND EXISTS (
      SELECT 1 FROM fishing_resorts fr
      JOIN spots s ON s.id = fr.spot_id
      WHERE fr.id::text = (storage.foldername(name))[2]
      AND s.user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'captures'
    AND EXISTS (
      SELECT 1 FROM captures
      WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'profiles'
    AND (storage.foldername(name))[2] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
)
WITH CHECK (
  bucket_id = 'photos'
  AND (
    (storage.foldername(name))[1] = 'spots'
    AND EXISTS (
      SELECT 1 FROM spots
      WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'resorts'
    AND EXISTS (
      SELECT 1 FROM fishing_resorts fr
      JOIN spots s ON s.id = fr.spot_id
      WHERE fr.id::text = (storage.foldername(name))[2]
      AND s.user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'captures'
    AND EXISTS (
      SELECT 1 FROM captures
      WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'profiles'
    AND (storage.foldername(name))[2] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
);

-- 5. Bucket 'support-attachments': apenas o criador do ticket pode gerenciar
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de anexos" ON storage.objects;

CREATE POLICY "Apenas dono do ticket ou admin pode gerenciar anexos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (
    (storage.foldername(name))[1] = 'tickets'
    AND EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
)
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (
    (storage.foldername(name))[1] = 'tickets'
    AND EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
);

-- 6. Criar bucket 'captures' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('captures', 'captures', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket 'captures'
CREATE POLICY "Capturas são públicas — leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'captures');

CREATE POLICY "Usuários autenticados podem fazer upload de capturas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'captures');

CREATE POLICY "Apenas dono da captura ou admin pode modificar"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'captures'
  AND (
    EXISTS (
      SELECT 1 FROM captures
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
)
WITH CHECK (
  bucket_id = 'captures'
  AND (
    EXISTS (
      SELECT 1 FROM captures
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
);
