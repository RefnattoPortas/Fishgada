-- Ativação manual do pesqueiro Sumaré solicitada pelo usuário
UPDATE public.fishing_resorts 
SET is_active = TRUE 
WHERE id IN (
  SELECT fr.id 
  FROM public.fishing_resorts fr 
  JOIN public.spots s ON s.id = fr.spot_id 
  WHERE s.title ILIKE '%Sumaré%'
);
