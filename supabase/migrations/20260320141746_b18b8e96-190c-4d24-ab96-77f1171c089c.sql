ALTER TABLE public.products ADD COLUMN featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN include_in_catalog boolean NOT NULL DEFAULT false;