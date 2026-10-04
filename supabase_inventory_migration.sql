ALTER TABLE public.freezer_items
    ADD COLUMN IF NOT EXISTS food_id bigint
    REFERENCES public.foods(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';