-- Noor Parfum · estructura de la base de datos
-- Ejecutar una sola vez en Supabase › SQL Editor.

-- Dueños autorizados: solo estos correos pueden ver y modificar datos.
create table if not exists public.duenos (
  email  text primary key,
  nombre text not null
);

create or replace function public.es_dueno() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.duenos where email = auth.jwt() ->> 'email');
$$;

-- Cada registro guarda sus campos en "data" (JSON), igual que la app.
create table if not exists public.productos (
  id text primary key,
  data jsonb not null,
  creado_por text default (auth.jwt() ->> 'email'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);
create table if not exists public.compras (
  id text primary key default gen_random_uuid()::text,
  data jsonb not null,
  creado_por text default (auth.jwt() ->> 'email'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);
create table if not exists public.movimientos (
  id text primary key default gen_random_uuid()::text,
  data jsonb not null,
  creado_por text default (auth.jwt() ->> 'email'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);

-- Seguridad: nadie que no sea dueño puede leer ni escribir.
alter table public.duenos      enable row level security;
alter table public.productos   enable row level security;
alter table public.compras     enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists duenos_leer on public.duenos;
create policy duenos_leer on public.duenos for select to authenticated using (public.es_dueno());

do $$ declare t text; begin
  foreach t in array array['productos','compras','movimientos'] loop
    execute format('drop policy if exists %1$s_duenos on public.%1$s', t);
    execute format('create policy %1$s_duenos on public.%1$s for all to authenticated using (public.es_dueno()) with check (public.es_dueno())', t);
  end loop;
end $$;

-- Actualización en vivo entre celulares.
do $$ begin
  begin alter publication supabase_realtime add table public.productos;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.compras;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.movimientos; exception when duplicate_object then null; end;
end $$;
