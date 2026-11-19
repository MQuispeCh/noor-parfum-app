-- Noor Parfum · Reseñas de clientes verificados
-- Ejecutar una vez en Supabase › SQL Editor (después de 004_tarjeta_fidelidad.sql).
--
-- Solo opina quien compró: desde Ventas, el dueño genera un link único para esa venta
-- (el id de la fila es un código secreto de un solo uso) y se lo manda por WhatsApp.
-- La reseña se publica sola. Los dueños pueden responderla u ocultarla (solo si es ofensiva o spam).

create table if not exists public.resenas (
  id text primary key,
  data jsonb not null,
  creado_por text default (auth.jwt() ->> 'email'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);
alter table public.resenas enable row level security;
drop policy if exists resenas_duenos on public.resenas;
create policy resenas_duenos on public.resenas for all to authenticated
  using (public.es_dueno()) with check (public.es_dueno());
do $$ begin
  alter publication supabase_realtime add table public.resenas;
exception when duplicate_object then null;
end $$;

-- Lo que ve el cliente al abrir su link
create or replace function public.resena_pendiente(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'producto', r.data->>'producto',
    'codigo', r.data->>'codigo',
    'nombre', split_part(trim(coalesce(r.data->>'cliente', '')), ' ', 1),
    'sugerido', trim(split_part(trim(coalesce(r.data->>'cliente', '')), ' ', 1) || ' ' ||
                coalesce(left(nullif(split_part(trim(coalesce(r.data->>'cliente', '')), ' ', 2), ''), 1) || '.', '')),
    'estado', r.data->>'estado'
  )
  from public.resenas r
  where r.id = upper(trim(p_token)) and length(trim(p_token)) >= 10;
$$;
revoke all on function public.resena_pendiente(text) from public;
grant execute on function public.resena_pendiente(text) to anon, authenticated;

-- El cliente envía su reseña (una sola vez por link)
create or replace function public.dejar_resena(p_token text, p_estrellas int, p_comentario text, p_nombre text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.resenas;
begin
  select * into r from public.resenas where id = upper(trim(p_token)) for update;
  if not found or length(trim(p_token)) < 10 then return jsonb_build_object('ok', false, 'error', 'no_existe'); end if;
  if r.data->>'estado' <> 'pendiente' then return jsonb_build_object('ok', false, 'error', 'ya_usado'); end if;
  if p_estrellas is null or p_estrellas < 1 or p_estrellas > 5 then return jsonb_build_object('ok', false, 'error', 'estrellas'); end if;
  update public.resenas set
    data = r.data || jsonb_build_object(
      'estado', 'publicada',
      'estrellas', p_estrellas,
      'comentario', left(trim(coalesce(p_comentario, '')), 600),
      'nombrePublico', left(coalesce(nullif(trim(p_nombre), ''), 'Cliente Noor'), 40),
      'fecha', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD')),
    actualizado_en = now()
  where id = r.id;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.dejar_resena(text, int, text, text) from public;
grant execute on function public.dejar_resena(text, int, text, text) to anon, authenticated;

-- Reseñas publicadas para el catálogo (sin celular ni nombre completo del cliente)
create or replace function public.resenas_publicas()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'codigo', r.data->>'codigo',
    'estrellas', (r.data->>'estrellas')::int,
    'comentario', r.data->>'comentario',
    'nombre', r.data->>'nombrePublico',
    'fecha', r.data->>'fecha',
    'respuesta', nullif(r.data->>'respuesta', '')
  ) order by r.data->>'fecha' desc, r.actualizado_en desc), '[]'::jsonb)
  from public.resenas r
  where r.data->>'estado' = 'publicada';
$$;
revoke all on function public.resenas_publicas() from public;
grant execute on function public.resenas_publicas() to anon, authenticated;
