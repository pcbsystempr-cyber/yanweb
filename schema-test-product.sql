-- Test product for Omy's Wood Art
-- Run this in Supabase SQL Editor after running schema.sql

-- Insert test category (id auto-generates)
INSERT INTO public.categories (name, slug, description, active, sort_order)
VALUES (
  'Muebles a Medida',
  'muebles-a-medida',
  'Muebles personalizados hechos a mano',
  true,
  1
) ON CONFLICT (slug) DO NOTHING;

-- Insert test product referencing the category
INSERT INTO public.products (
  name,
  slug,
  description,
  price,
  images,
  category_id,
  active,
  featured,
  sort_order,
  weight_kg,
  length_cm,
  width_cm,
  height_cm
)
SELECT
  'Mesa de Comedor Roble',
  'mesa-comedor-roble',
  'Mesa de comedor artesanal en roble macizo, hecha a mano con acabado natural. Dimensiones personalizables. Ideal para 6-8 personas.',
  1250.00,
  ARRAY['assets/hero-banner.jpg'],
  c.id,
  true,
  true,
  1,
  25.0,
  180.0,
  90.0,
  75.0
FROM public.categories c
WHERE c.slug = 'muebles-a-medida'
ON CONFLICT (slug) DO NOTHING;