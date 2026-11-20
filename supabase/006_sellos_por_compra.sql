-- Noor Parfum · Tarjeta: packs = 1 sello y opción "1 sello por compra"
-- Ejecutar una vez en Supabase › SQL Editor (después de 005_resenas.sql).
--
-- Reemplaza el conteo de sellos para que respete la regla elegida en la app (Tarjetas › Reglas):
--   modo "perfume": 1 sello por cada perfume o set suelto; un pack cuenta como 1 por pack (aunque traiga 2 perfumes)
--   modo "compra":  1 sello por cada día con compra, aunque lleve varios productos
-- Mismo cálculo que app.js › detalleSellos.

create or replace function public.tarjeta_sellos(p jsonb)
returns int language sql stable security definer set search_path = public as $$
  with m as (
    select x.data->>'fecha' as fecha, x.data->>'tipo' as tipo, x.data->>'codigo' as codigo, x.data->>'pack' as pack,
           coalesce((x.data->>'cant')::numeric, 0) as cant,
           case when x.data->>'tipo' = 'Devolución' then -1 else 1 end as sg,
           coalesce(pr.data->>'categoria', '') in ('Perfume', 'Set') as cuenta
    from public.movimientos x
    left join public.productos pr on pr.id = x.data->>'codigo'
    where x.data->>'tipo' in ('Venta', 'Devolución')
      and length(regexp_replace(coalesce(p->>'telefono', ''), '\D', '', 'g')) >= 9
      and right(regexp_replace(coalesce(x.data->>'telefono', ''), '\D', '', 'g'), 9)
          = right(regexp_replace(coalesce(p->>'telefono', ''), '\D', '', 'g'), 9)
      and coalesce(x.data->>'fecha', '') >= coalesce(p->>'desde', '')
  ),
  u as (
    -- perfumes y sets sueltos
    select fecha, sg * cant as uds from m where pack is null and cuenta
    union all
    -- packs: 1 por pack vendido (cantidad del componente ÷ lo que trae el pack)
    select m.fecha, max(m.sg) * min(round(m.cant / greatest(1, coalesce((
             select (c->>'cant')::numeric from public.productos pk, jsonb_array_elements(pk.data->'componentes') c
             where pk.id = m.pack and c->>'codigo' = m.codigo limit 1), 1)))) as uds
    from m where pack is not null
    group by m.pack, m.fecha, m.tipo
    having bool_or(m.cuenta)
  ),
  modo as (select coalesce((select a.data->>'modo' from public.ajustes a where a.id = 'fidelidad'), 'perfume') as v)
  select greatest(0, (case when (select v from modo) = 'compra'
            then (select count(*) from (select fecha from u group by fecha having sum(uds) > 0) d)
            else coalesce((select sum(uds) from u), 0) end)::int
         + coalesce((p->>'extra')::int, 0));
$$;
revoke all on function public.tarjeta_sellos(jsonb) from public;
grant execute on function public.tarjeta_sellos(jsonb) to authenticated;
