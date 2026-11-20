-- Noor Parfum · Tarjeta: opción "1 sello por compra"
-- Ejecutar una vez en Supabase › SQL Editor (después de 005_resenas.sql).
--
-- Reemplaza el conteo de sellos para que respete la regla elegida en la app (Tarjetas › Reglas):
--   modo "perfume": 1 sello por cada perfume o set comprado
--   modo "compra":  1 sello por cada día con compra, aunque lleve varios perfumes
-- Mismo cálculo que app.js › detalleSellos.

create or replace function public.tarjeta_sellos(p jsonb)
returns int language sql stable security definer set search_path = public as $$
  with v as (
    select m.data->>'fecha' as fecha,
           case when m.data->>'tipo' = 'Devolución' then -(m.data->>'cant')::numeric else (m.data->>'cant')::numeric end as uds
    from public.movimientos m
    join public.productos pr on pr.id = m.data->>'codigo'
    where m.data->>'tipo' in ('Venta', 'Devolución')
      and pr.data->>'categoria' in ('Perfume', 'Set')
      and length(regexp_replace(coalesce(p->>'telefono', ''), '\D', '', 'g')) >= 9
      and right(regexp_replace(coalesce(m.data->>'telefono', ''), '\D', '', 'g'), 9)
          = right(regexp_replace(coalesce(p->>'telefono', ''), '\D', '', 'g'), 9)
      and coalesce(m.data->>'fecha', '') >= coalesce(p->>'desde', '')
  ),
  modo as (select coalesce((select a.data->>'modo' from public.ajustes a where a.id = 'fidelidad'), 'perfume') as m)
  select greatest(0, (case when (select m from modo) = 'compra'
            then (select count(*) from (select fecha from v group by fecha having sum(uds) > 0) d)
            else coalesce((select sum(uds) from v), 0) end)::int
         + coalesce((p->>'extra')::int, 0));
$$;
revoke all on function public.tarjeta_sellos(jsonb) from public;
grant execute on function public.tarjeta_sellos(jsonb) to authenticated;
