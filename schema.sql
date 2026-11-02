-- Omy's Wood Art — Esquema de base de datos (TAREA 1)
-- INSTRUCCIONES: Cómo correrlo en el SQL Editor de Supabase
-- 1. Ve a tu proyecto en https://app.supabase.com/
-- 2. Abre SQL Editor → New Query
-- 3. Ejecuta schema.sql PRIMERO, luego schema_municipalities.sql (si existe por separado)
-- 4. Copia TODO el contenido de este archivo y pega en el editor
-- 5. Presiona "Run" para ejecutar
-- 6. Al finalizar, verifica que no hayan errores en la consola
-- 
-- NOTAS: Solo crea tablas, funciones, RLS, políticas y buckets. 
-- No incluye contraseñas ni llaves secretas.

-- ============================================================
-- 1. Función helper: verificar si el usuario es admin
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
      and active = true
  );
$$;

-- ============================================================
-- 2. Administradores
-- ============================================================
create table if not exists public.admins (
  id bigserial primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.admins is 'Usuarios con permisos de administrador';

-- ============================================================
-- 3. Categorías de productos
-- ============================================================
create table if not exists public.categories (
  id bigserial primary key,
  name text not null,
  slug text unique not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.categories is 'Categorías para organizar productos';

-- ============================================================
-- 4. Productos
-- ============================================================
create table if not exists public.products (
  id bigserial primary key,
  category_id bigint references public.categories(id) on delete set null,
  slug text unique not null,
  name text not null,
  description text default '',
  price numeric(12,2) not null default 0,
  currency text not null default 'USD',
  wood_type text default '',
  dimensions text default '',
  lead_time_days int default 14,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  images text[] default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.products is 'Catálogo de productos (images como array de URLs/paths)';

-- ============================================================
-- 5. Municipios de Puerto Rico (78)
-- ============================================================
create table if not exists public.municipalities (
  id bigserial primary key,
  name text unique not null,
  region text not null,
  base_price numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);
comment on table public.municipalities is 'Municipios de Puerto Rico con precio base de entrega';

-- ============================================================
-- 6. Configuración de entrega
-- ============================================================
create table if not exists public.delivery_settings (
  id bigserial primary key,
  key text unique not null,
  value text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
comment on table public.delivery_settings is 'Configuración general de entrega';

-- ============================================================
-- 7. Testimonios
-- ============================================================
create table if not exists public.testimonials (
  id bigserial primary key,
  name text not null,
  text text not null,
  project text default '',
  rating int not null default 5 check (rating between 1 and 5),
  storage_path text default '',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.testimonials is 'Testimonios de clientes';

-- ============================================================
-- 8. Contenido del sitio
-- ============================================================
create table if not exists public.site_content (
  id bigserial primary key,
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
comment on table public.site_content is 'Contenido editable del sitio (key-value)';

-- ============================================================
-- 9. Leads / Contacto
-- ============================================================
create table if not exists public.leads (
  id bigserial primary key,
  name text not null,
  email text default '',
  phone text default '',
  message text default '',
  product_id bigint references public.products(id) on delete set null,
  municipality_id bigint references public.municipalities(id) on delete set null,
  status text not null default 'new',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.leads is 'Solicitudes de cotización/contacto (público puede insertar)';

-- ============================================================
-- 10. Administradores - insert comentado (sin contraseña)
-- ============================================================
-- Para agregar un admin: primero registra el usuario en Supabase Auth,
-- luego descomenta e inserta con el user_id y email correspondientes.
-- INSERT INTO public.admins (user_id, email, active) VALUES
--   ('REEMPLAZA_CON_USER_UUID', 'omyswoodarts@gmail.com', true);

-- ============================================================
-- 11. Row Level Security (RLS)
-- ============================================================
alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.municipalities enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_content enable row level security;
alter table public.leads enable row level security;

-- Políticas para lectura pública (solo filas activas)
create policy "Public can read active categories" on public.categories for select using (active = true);
create policy "Public can read active products" on public.products for select using (active = true);
create policy "Public can read active municipalities" on public.municipalities for select using (active = true);
create policy "Public can read active delivery_settings" on public.delivery_settings for select using (active = true);
create policy "Public can read active testimonials" on public.testimonials for select using (active = true);
create policy "Public can read active site_content" on public.site_content for select using (active = true);
create policy "Public can read active leads" on public.leads for select using (active = true);

-- El público puede insertar leads
create policy "Public can insert leads" on public.leads for insert with check (true);

-- Políticas para administradores (acceso completo)
create policy "Admins full access to admins" on public.admins for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins full access to categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins full access to products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins full access to municipalities" on public.municipalities for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins full access to delivery_settings" on public.delivery_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins full access to testimonials" on public.testimonials for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins full access to site_content" on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins full access to leads" on public.leads for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 12. Storage Buckets y Políticas
-- ============================================================
insert into storage.buckets (id, name, public) values ('product-images','product-images',true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('site-assets','site-assets',true) on conflict (id) do nothing;

create policy "Public read product-images" on storage.objects for select using (bucket_id='product-images');
create policy "Public read site-assets" on storage.objects for select using (bucket_id='site-assets');
create policy "Admins write product-images" on storage.objects for all using (bucket_id='product-images' and public.is_admin()) with check (bucket_id='product-images' and public.is_admin());
create policy "Admins write site-assets" on storage.objects for all using (bucket_id='site-assets' and public.is_admin()) with check (bucket_id='site-assets' and public.is_admin());

-- ============================================================
-- 13. Datos: Municipios (78)
-- ============================================================
-- Ejecuta también schema_municipalities.sql si lo prefieres por separado
insert into public.municipalities (name, region, base_price, sort_order) values
('Adjuntas','Central',0,1),('Aguada','Oeste',0,2),('Aguadilla','Oeste',0,3),('Aguas Buenas','Central',0,4),('Aibonito','Sur',0,5),('Añasco','Oeste',0,6),('Arecibo','Norte',0,7),('Arroyo','Sur',0,8),('Barceloneta','Norte',0,9),('Barranquitas','Central',0,10),
('Bayamón','Metro',0,11),('Cabo Rojo','Oeste',0,12),('Caguas','Central',0,13),('Camuy','Norte',0,14),('Canóvanas','Este',0,15),('Carolina','Metro',0,16),('Cataño','Metro',0,17),('Cayey','Central',0,18),('Ceiba','Este',0,19),('Ciales','Central',0,20),
('Cidra','Central',0,21),('Coamo','Sur',0,22),('Comerío','Central',0,23),('Corozal','Central',0,24),('Culebra','Este',0,25),('Dorado','Norte',0,26),('Fajardo','Este',0,27),('Florida','Norte',0,28),('Guánica','Sur',0,29),('Guayama','Sur',0,30),
('Guayanilla','Sur',0,31),('Guaynabo','Metro',0,32),('Gurabo','Central',0,33),('Hatillo','Norte',0,34),('Hormigueros','Oeste',0,35),('Humacao','Este',0,36),('Isabela','Oeste',0,37),('Jayuya','Central',0,38),('Juana Díaz','Sur',0,39),('Juncos','Central',0,40),
('Lajas','Oeste',0,41),('Lares','Oeste',0,42),('Las Marías','Oeste',0,43),('Las Piedras','Este',0,44),('Loíza','Metro',0,45),('Luquillo','Este',0,46),('Manatí','Norte',0,47),('Maricao','Oeste',0,48),('Maunabo','Este',0,49),('Mayagüez','Oeste',0,50),
('Moca','Oeste',0,51),('Morovis','Norte',0,52),('Naguabo','Este',0,53),('Naranjito','Central',0,54),('Orocovis','Central',0,55),('Patillas','Sur',0,56),('Peñuelas','Sur',0,57),('Ponce','Sur',0,58),('Quebradillas','Norte',0,59),('Rincón','Oeste',0,60),
('Río Grande','Este',0,61),('Sabana Grande','Oeste',0,62),('Salinas','Sur',0,63),('San Germán','Oeste',0,64),('San Juan','Metro',0,65),('San Lorenzo','Este',0,66),('San Sebastián','Oeste',0,67),('Santa Isabel','Sur',0,68),('Toa Alta','Metro',0,69),('Toa Baja','Metro',0,70),
('Trujillo Alto','Metro',0,71),('Utuado','Central',0,72),('Vega Alta','Norte',0,73),('Vega Baja','Norte',0,74),('Vieques','Este',0,75),('Villalba','Central',0,76),('Yabucoa','Este',0,77),('Yauco','Sur',0,78)
on conflict (name) do nothing;
