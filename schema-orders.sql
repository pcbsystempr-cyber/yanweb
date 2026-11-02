-- Omy's Wood Art — Tablas de Pedidos (TAREA 12)
-- Ejecutar DESPUÉS de schema.sql
-- INSTRUCCIONES: Cómo correrlo en el SQL Editor de Supabase
-- 1. Ve a tu proyecto en https://app.supabase.com/
-- 2. Abre SQL Editor → New Query
-- 3. Copia TODO el contenido de este archivo y pega en el editor
-- 4. Presiona "Run" para ejecutar
-- 5. Al finalizar, verifica que no hayan errores en la consola

-- ============================================================
-- 1. Pedidos
-- ============================================================
create table if not exists public.orders (
  id bigserial primary key,
  customer_name text not null,
  customer_phone text not null,
  notes text default '',
  municipality_id bigint references public.municipalities(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  shipping_cost numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'pendiente',
  admin_notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.orders is 'Pedidos creados únicamente desde Edge Function';

-- ============================================================
-- 2. Ítems de pedido
-- ============================================================
create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null default 0,
  qty int not null default 1,
  created_at timestamptz not null default now()
);
comment on table public.order_items is 'Líneas de pedido';

-- ============================================================
-- 3. Row Level Security (RLS)
-- ============================================================
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- El público NO puede leer ni escribir directo
-- Solo admins leen y editan
create policy "Admins full access to orders" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access to order_items" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 4. Índices para performance
-- ============================================================
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);