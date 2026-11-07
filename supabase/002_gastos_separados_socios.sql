-- Noor Parfum · tablas para Gastos, Separados y Cuentas entre socios
-- Ejecutar una vez en Supabase › SQL Editor (después de schema.sql).

do $$ declare t text; begin
  foreach t in array array['gastos','separados','socios_mov','ajustes'] loop
    execute format($f$
      create table if not exists public.%1$s (
        id text primary key default gen_random_uuid()::text,
        data jsonb not null,
        creado_por text default (auth.jwt() ->> 'email'),
        creado_en timestamptz not null default now(),
        actualizado_en timestamptz
      )$f$, t);
    execute format('alter table public.%1$s enable row level security', t);
    execute format('drop policy if exists %1$s_duenos on public.%1$s', t);
    execute format('create policy %1$s_duenos on public.%1$s for all to authenticated using (public.es_dueno()) with check (public.es_dueno())', t);
    begin
      execute format('alter publication supabase_realtime add table public.%1$s', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Reparto de ganancias entre socios (cámbialo desde la app en Socios › Porcentajes)
insert into public.ajustes (id, data) values ('socios', '{"pct": {"Jesús": 50, "Jaime": 50}}'::jsonb)
on conflict (id) do nothing;
