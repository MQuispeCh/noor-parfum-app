-- Noor Parfum · Tarjeta de fidelidad virtual
-- Ejecutar una vez en Supabase › SQL Editor (después de 003_packs_catalogo.sql).
--
-- Cada cliente tiene una tarjeta con un código secreto (el id). Los sellos salen solos
-- de las ventas registradas con su celular: 1 sello por cada perfume o set comprado
-- desde la fecha "desde" de la tarjeta. Los dueños pueden sumar o quitar sellos a mano.

create table if not exists public.tarjetas (
  id text primary key,
  data jsonb not null,
  creado_por text default (auth.jwt() ->> 'email'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);
alter table public.tarjetas enable row level security;
drop policy if exists tarjetas_duenos on public.tarjetas;
create policy tarjetas_duenos on public.tarjetas for all to authenticated
  using (public.es_dueno()) with check (public.es_dueno());
do $$ begin
  alter publication supabase_realtime add table public.tarjetas;
exception when duplicate_object then null;
end $$;

-- Reglas del programa (se cambian desde la app en Tarjetas › Reglas)
insert into public.ajustes (id, data) values ('fidelidad', '{
  "meta": 6,
  "premios": [
    {"en": 3, "premio": "Body spray de regalo"},
    {"en": 6, "premio": "S/ 40 de descuento en tu siguiente perfume"}
  ]
}'::jsonb)
on conflict (id) do nothing;

-- Sellos ganados por una tarjeta (ventas con su celular desde la fecha de la tarjeta)
create or replace function public.tarjeta_sellos(p jsonb)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((
    select sum(case when m.data->>'tipo' = 'Devolución' then -(m.data->>'cant')::numeric
                    else (m.data->>'cant')::numeric end)
    from public.movimientos m
    join public.productos pr on pr.id = m.data->>'codigo'
    where m.data->>'tipo' in ('Venta', 'Devolución')
      and pr.data->>'categoria' in ('Perfume', 'Set')
      and right(regexp_replace(coalesce(m.data->>'telefono', ''), '\D', '', 'g'), 9)
          = right(regexp_replace(coalesce(p->>'telefono', ''), '\D', '', 'g'), 9)
      and length(regexp_replace(coalesce(p->>'telefono', ''), '\D', '', 'g')) >= 9
      and coalesce(m.data->>'fecha', '') >= coalesce(p->>'desde', '')
  ), 0)::int + coalesce((p->>'extra')::int, 0);
$$;
revoke all on function public.tarjeta_sellos(jsonb) from public;
grant execute on function public.tarjeta_sellos(jsonb) to authenticated;

-- Lo que ve el cliente al abrir su link (sin celular ni datos de otros clientes)
create or replace function public.tarjeta_publica(p_codigo text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nombre', split_part(trim(t.data->>'nombre'), ' ', 1),
    'desde', t.data->'desde',
    'sellos', public.tarjeta_sellos(t.data),
    'canjes', coalesce(t.data->'canjes', '[]'::jsonb),
    'reglas', (select a.data from public.ajustes a where a.id = 'fidelidad')
  )
  from public.tarjetas t
  where t.id = upper(trim(p_codigo)) and length(trim(p_codigo)) >= 8;
$$;
revoke all on function public.tarjeta_publica(text) from public;
grant execute on function public.tarjeta_publica(text) to anon, authenticated;
