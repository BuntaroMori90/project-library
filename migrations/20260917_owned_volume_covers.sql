-- Additive migration. Apply to an isolated branch first; production requires approval.
ALTER TABLE public.owned_units
  ADD COLUMN IF NOT EXISTS custom_cover_url text;
COMMENT ON COLUMN public.owned_units.custom_cover_url IS
  'Personal cover of the owned copy; never overwrites shared catalog artwork.';
