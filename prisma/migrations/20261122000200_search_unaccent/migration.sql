-- Accent-insensitive search for news ("dialogu" finds "diálogu", "Lautem" finds "Lautém").
-- Mobile keyboards in Timor-Leste often omit diacritics, so search must ignore them.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is STABLE; this IMMUTABLE wrapper (fixed dictionary) makes it usable
-- in indexes and lets the planner inline it.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
